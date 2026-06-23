import { Mic, MicOff, PhoneOff, Radio, Activity, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { socket } from "../services/socket";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const VORY_VOICE_STORE_KEY = "__voryPersistentVoiceCore";

function getPersistentVoiceStore() {
  if (typeof window === "undefined") return null;

  if (!window[VORY_VOICE_STORE_KEY]) {
    window[VORY_VOICE_STORE_KEY] = {
      wanted: false,
      roomCode: "",
      username: "",
      stream: null,
      muted: false,
      forceMuted: false,
      updatedAt: 0,
    };
  }

  return window[VORY_VOICE_STORE_KEY];
}

function updatePersistentVoiceStore(patch = {}) {
  const store = getPersistentVoiceStore();
  if (!store) return null;

  Object.assign(store, patch, { updatedAt: Date.now() });
  return store;
}

export default function VoiceChat({ roomCode, username, onReaction, onVoiceUsersChange, compact = false, hostMuteAll = false }) {
  const initialVoiceStore = getPersistentVoiceStore();
  const initialVoiceWanted = !!(initialVoiceStore?.wanted && initialVoiceStore?.roomCode === roomCode && initialVoiceStore?.stream);
  const [isVoiceOn, setIsVoiceOn] = useState(initialVoiceWanted);
  const [isMuted, setIsMuted] = useState(!!initialVoiceStore?.muted);
  const [voiceUsers, setVoiceUsers] = useState([]);
  const [voiceLevels, setVoiceLevels] = useState({});
  const [forceMutedByHost, setForceMutedByHost] = useState(false);

  const localStreamRef = useRef(null);
  const peersRef = useRef({});
  const pendingIceRef = useRef({});
  const audioRefs = useRef({});
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const levelIntervalRef = useRef(null);
  const isMutedRef = useRef(!!initialVoiceStore?.muted);
  const forceMutedByHostRef = useRef(!!initialVoiceStore?.forceMuted);
  const listenerJoinedRef = useRef(false);
  const keepVoiceSessionRef = useRef(true);
  const currentRoomRef = useRef(roomCode);
  const isVoiceOnRef = useRef(initialVoiceWanted);

  function markVoiceTransition(ms = 4200) {
    try {
      window.__voryVoiceTransitionUntil = Date.now() + ms;
      window.__voryMediaPersistUntil = Date.now() + Math.max(ms, 6500);
      window.__voryMediaGuardUntil = Date.now() + Math.max(ms, 30000);
      window.dispatchEvent(new CustomEvent("vory-voice-transition", { detail: { until: window.__voryVoiceTransitionUntil } }));
    } catch {}
  }

  useEffect(() => {
    currentRoomRef.current = roomCode;
  }, [roomCode]);

  useEffect(() => {
    isVoiceOnRef.current = isVoiceOn;
  }, [isVoiceOn]);

  useEffect(() => {
    function handleVoiceVisibility() {
      try {
        const store = getPersistentVoiceStore();
        if (!roomCode || !store?.wanted) return;

        if (document.visibilityState === "hidden") {
          window.__voryVoiceSessionWanted = true;
          window.__voryVoiceActiveRoom = roomCode;
          window.__voryMediaGuardUntil = Date.now() + 30000;
          socket.emit("voice-background-keepalive", { roomCode, username: store.username || username });
          return;
        }

        socket.emit("voice-join", { roomCode, username: store.username || username, restore: true });
        socket.emit("get-voice-users", { roomCode });
      } catch {}
    }

    document.addEventListener("visibilitychange", handleVoiceVisibility);
    window.addEventListener("focus", handleVoiceVisibility);
    window.addEventListener("pagehide", handleVoiceVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVoiceVisibility);
      window.removeEventListener("focus", handleVoiceVisibility);
      window.removeEventListener("pagehide", handleVoiceVisibility);
    };
  }, [roomCode, username]);


  useEffect(() => {
    const store = getPersistentVoiceStore();
    if (!roomCode || !store?.wanted || store.roomCode !== roomCode || !store.stream) return;

    const hasLiveTrack = store.stream.getAudioTracks?.().some((track) => track.readyState === "live");
    if (!hasLiveTrack) {
      updatePersistentVoiceStore({ wanted: false, stream: null, roomCode: "" });
      return;
    }

    localStreamRef.current = store.stream;
    isMutedRef.current = !!store.muted;
    forceMutedByHostRef.current = !!store.forceMuted;
    setIsMuted(!!store.muted);
    setForceMutedByHost(!!store.forceMuted);
    setIsVoiceOn(true);
    startLevelMeter(store.stream);

    try {
      window.__voryVoiceActiveRoom = roomCode;
      window.__voryVoiceSessionWanted = true;
    } catch {}

    socket.emit("voice-join", { roomCode, username: store.username || username, restore: true });
    socket.emit("get-voice-users", { roomCode });

    // component remount olduysa eski remote audio/peer bağlantılarını yeniden ister.
    window.setTimeout(() => {
      try {
        socket.emit("voice-join", { roomCode, username: store.username || username, restore: true });
        socket.emit("get-voice-users", { roomCode });
      } catch {}
    }, 450);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]);

  function normalizedVoiceUsers(list = voiceUsers) {
    const seen = new Set();
    const safeList = (list || [])
      .filter((user) => user?.socketId)
      .filter((user) => {
        if (seen.has(user.socketId)) return false;
        seen.add(user.socketId);
        return true;
      });

    if (isVoiceOn && socket.id && !safeList.some((user) => user.socketId === socket.id)) {
      safeList.unshift({
        socketId: socket.id,
        username: username || "Sen",
        muted: isMutedRef.current,
        level: voiceLevels[socket.id] || 0,
      });
    }

    return safeList.map((user) => ({
      ...user,
      username: user.username || (user.socketId === socket.id ? username : "Kullanıcı"),
      muted: user.socketId === socket.id ? isMutedRef.current : !!user.muted,
      level: voiceLevels[user.socketId] || user.level || 0,
    }));
  }

  function publishVoiceUsers(nextUsers = voiceUsers) {
    // Vory 5.2.2: Rave mantığı. Kullanıcı voice'a katılmamış olsa bile
    // odadaki mevcut voice roster'ı görmeli. Bu yüzden listeyi asla
    // sadece local isVoiceOn durumuna göre sıfırlamıyoruz.
    onVoiceUsersChange?.(normalizedVoiceUsers(nextUsers));
  }

  function participantCount() {
    return isVoiceOn ? normalizedVoiceUsers().length : 0;
  }

  function ensureListening() {
    if (!roomCode || localStreamRef.current || listenerJoinedRef.current) return;

    try {
      socket.emit("voice-listen", { roomCode, username });
      listenerJoinedRef.current = true;
      socket.emit("get-voice-users", { roomCode });
    } catch {}
  }

  function updateLocalLevel(level) {
    setVoiceLevels((prev) => ({
      ...prev,
      [socket.id]: level,
    }));
  }

  function startLevelMeter(stream) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.65;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      clearInterval(levelIntervalRef.current);

      levelIntervalRef.current = setInterval(() => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);

        const average =
          dataArray.reduce((total, value) => total + value, 0) / dataArray.length;

        const level = Math.min(100, Math.round(average * 2.2));
        const finalLevel = isMutedRef.current ? 0 : level;

        updateLocalLevel(finalLevel);

        socket.emit("voice-level", {
          roomCode,
          level: finalLevel,
        });
      }, 650);
    } catch (error) {
      console.error("Voice meter error:", error);
    }
  }

  function stopLevelMeter() {
    clearInterval(levelIntervalRef.current);
    levelIntervalRef.current = null;

    try {
      audioContextRef.current?.close();
    } catch {}

    audioContextRef.current = null;
    analyserRef.current = null;
  }

  async function flushPendingIce(targetSocketId) {
    const peer = peersRef.current[targetSocketId];
    const pending = pendingIceRef.current[targetSocketId] || [];

    if (!peer || !peer.remoteDescription || !pending.length) return;

    pendingIceRef.current[targetSocketId] = [];

    for (const candidate of pending) {
      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {}
    }
  }

  async function startVoice() {
    markVoiceTransition(5200);
    try {
      window.__voryVoiceSessionWanted = true;
      window.__voryVoiceActiveRoom = roomCode;
      window.__voryMediaGuardUntil = Date.now() + 30000;
      window.__voryMediaPersistUntil = Date.now() + 30000;
    } catch {}

    try {
      if (!roomCode) {
        toast.error("Önce bir odaya gir.");
        return;
      }

      if (hostMuteAll || forceMutedByHostRef.current) {
        forceMutedByHostRef.current = true;
        setForceMutedByHost(true);
        toast.error("Host herkesi susturdu. Mikrofon ayar açılınca aktif olur.");
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 80));
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });

      socket.emit("voice-unlisten", { roomCode });
      listenerJoinedRef.current = false;
      localStreamRef.current = stream;
      try {
        window.__voryVoiceActiveRoom = roomCode;
        window.__voryVoiceSessionWanted = true;
        updatePersistentVoiceStore({
          wanted: true,
          roomCode,
          username,
          stream,
          muted: false,
          forceMuted: false,
        });
      } catch {}
      isMutedRef.current = false;
      setIsVoiceOn(true);
      setIsMuted(false);

      startLevelMeter(stream);

      socket.emit("voice-join", {
        roomCode,
        username,
      });

      onVoiceUsersChange?.([{
        socketId: socket.id,
        username: username || "Sen",
        muted: false,
        level: 0,
      }]);

      markVoiceTransition(3600);
      toast.success("Mikrofon açıldı 🎙️");
    } catch (error) {
      toast.error("Mikrofon izni alınamadı.");
    }
  }

  function stopVoice() {
    markVoiceTransition(3200);
    try {
      window.__voryMediaGuardUntil = Date.now() + 18000;
      window.__voryMediaPersistUntil = Date.now() + 18000;
    } catch {}

    Object.values(peersRef.current).forEach((peer) => {
      try {
        peer.close();
      } catch {}
    });

    peersRef.current = {};
    pendingIceRef.current = {};

    Object.values(audioRefs.current).forEach((audio) => {
      try {
        audio.remove();
      } catch {}
    });

    audioRefs.current = {};

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    try {
      window.__voryVoiceActiveRoom = "";
      window.__voryVoiceSessionWanted = false;
      updatePersistentVoiceStore({
        wanted: false,
        roomCode: "",
        username: "",
        stream: null,
        muted: false,
        forceMuted: false,
      });
    } catch {}

    stopLevelMeter();

    if (roomCode) {
      socket.emit("voice-leave", { roomCode });
    }

    setTimeout(() => {
      if (!roomCode || isVoiceOn) return;
      socket.emit("voice-listen", { roomCode, username });
      listenerJoinedRef.current = true;
    }, 350);
    setVoiceLevels({});
    setIsVoiceOn(false);
    setIsMuted(false);
    isMutedRef.current = false;

    toast.success("Mikrofon kapatıldı.");
  }

  function createPeer(targetSocketId, initiator, listenOnly = false) {
    if (peersRef.current[targetSocketId]) {
      return peersRef.current[targetSocketId];
    }

    const peer = new RTCPeerConnection(ICE_SERVERS);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        peer.addTrack(track, localStreamRef.current);
      });
    } else if (listenOnly) {
      try {
        peer.addTransceiver("audio", { direction: "recvonly" });
      } catch {}
    }

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("voice-ice-candidate", {
          target: targetSocketId,
          candidate: event.candidate,
        });
      }
    };

    peer.ontrack = (event) => {
      const [remoteStream] = event.streams;

      let audio = audioRefs.current[targetSocketId];

      if (!audio) {
        audio = document.createElement("audio");
        audio.autoplay = true;
        audio.playsInline = true;
        audio.preload = "auto";
        audio.muted = false;
        audio.setAttribute("playsinline", "true");
        audio.setAttribute("webkit-playsinline", "true");
        audio.className = "vory-hidden-voice-audio";
        document.body.appendChild(audio);
        audioRefs.current[targetSocketId] = audio;
      }

      if (audio.srcObject !== remoteStream) {
        audio.srcObject = remoteStream;
      }

      audio.play?.().catch(() => {});
    };

    peer.onconnectionstatechange = () => {
      const state = peer.connectionState;
      if (state === "failed" || state === "closed") {
        removePeer(targetSocketId);
        return;
      }

      if (state === "disconnected") {
        // Mobil background veya sekme switch anında WebRTC kısa süre disconnected dönebilir.
        // Hemen roster/peer silmek yerine toparlanması için kısa grace bırak.
        setTimeout(() => {
          const currentPeer = peersRef.current[targetSocketId];
          if (!currentPeer) return;
          if (currentPeer.connectionState === "disconnected") {
            removePeer(targetSocketId);
            if (currentRoomRef.current) socket.emit("get-voice-users", { roomCode: currentRoomRef.current });
          }
        }, 15000);
      }
    };

    peersRef.current[targetSocketId] = peer;

    if (initiator) {
      peer
        .createOffer()
        .then((offer) => peer.setLocalDescription(offer))
        .then(() => {
          socket.emit("voice-offer", {
            target: targetSocketId,
            offer: peer.localDescription,
          });
        });
    }

    return peer;
  }

  function removePeer(socketId) {
    const peer = peersRef.current[socketId];

    if (peer) {
      try {
        peer.close();
      } catch {}
      delete peersRef.current[socketId];
      delete pendingIceRef.current[socketId];
    }

    const audio = audioRefs.current[socketId];

    if (audio) {
      try {
        audio.remove();
      } catch {}
      delete audioRefs.current[socketId];
    }

    setVoiceLevels((prev) => {
      const next = { ...prev };
      delete next[socketId];
      return next;
    });
  }

  function applyHostMuteAllLock() {
    const track = localStreamRef.current?.getAudioTracks?.()[0];

    if (track) {
      track.enabled = false;
    }

    forceMutedByHostRef.current = true;
    setForceMutedByHost(true);

    isMutedRef.current = true;
    setIsMuted(true);

    updateLocalLevel(0);

    socket.emit("voice-mute-state", {
      roomCode,
      muted: true,
    });

    socket.emit("voice-level", {
      roomCode,
      level: 0,
    });
  }

  function toggleMute() {
    const track = localStreamRef.current?.getAudioTracks()?.[0];
    if (!track) return;

    if (forceMutedByHostRef.current) {
      track.enabled = false;
      isMutedRef.current = true;
      setIsMuted(true);
      updatePersistentVoiceStore({
        wanted: true,
        roomCode,
        username,
        stream: localStreamRef.current,
        muted: true,
        forceMuted: true,
      });
      updateLocalLevel(0);

      socket.emit("voice-mute-state", {
        roomCode,
        muted: true,
      });

      socket.emit("voice-level", {
        roomCode,
        level: 0,
      });

      toast.error("Host Mute All açtı. Mikrofonu sadece host izin verince açabilirsin.");
      return;
    }

    track.enabled = !track.enabled;
    const muted = !track.enabled;

    isMutedRef.current = muted;
    setIsMuted(muted);
    updatePersistentVoiceStore({
      wanted: true,
      roomCode,
      username,
      stream: localStreamRef.current,
      muted,
      forceMuted: forceMutedByHostRef.current,
    });

    socket.emit("voice-mute-state", {
      roomCode,
      muted,
    });

    if (muted) {
      updateLocalLevel(0);
      socket.emit("voice-level", {
        roomCode,
        level: 0,
      });
    }

    toast.success(track.enabled ? "Mikrofon açıldı" : "Mikrofon kapandı");
  }

  function sendQuickReaction(emoji) {
    if (!roomCode) {
      toast.error("Önce odaya gir.");
      return;
    }

    onReaction?.(emoji);
  }


  useEffect(() => {
    if (!roomCode) {
      listenerJoinedRef.current = false;
      onVoiceUsersChange?.([]);
      setVoiceUsers([]);
      setVoiceLevels({});
      return;
    }

    socket.emit("get-voice-users", { roomCode });

    const listenTimer = setTimeout(() => {
      if (!listenerJoinedRef.current && !localStreamRef.current) {
        socket.emit("voice-listen", { roomCode, username });
        listenerJoinedRef.current = true;
      }
    }, 300);

    return () => {
      clearTimeout(listenTimer);
      if (listenerJoinedRef.current) {
        socket.emit("voice-unlisten", { roomCode });
        listenerJoinedRef.current = false;
      }
    };
  }, [roomCode, username]);

  useEffect(() => {
    publishVoiceUsers();
  }, [isVoiceOn, isMuted, voiceUsers, voiceLevels, username]);


  useEffect(() => {
    socket.on("voice-users", ({ users }) => {
      const safeUsers = (users || []).filter((user) => user?.socketId);
      setVoiceUsers(safeUsers);
      onVoiceUsersChange?.(normalizedVoiceUsers(safeUsers));

      setVoiceLevels((prev) => {
        const next = { ...prev };

        safeUsers.forEach((user) => {
          if (typeof next[user.socketId] !== "number") {
            next[user.socketId] = user.level || 0;
          }
        });

        return next;
      });
    });

    socket.on("voice-level-update", ({ socketId, level }) => {
      setVoiceLevels((prev) => ({
        ...prev,
        [socketId]: level || 0,
      }));
    });

    socket.on("voice-peers", ({ peers }) => {
      const listenOnly = !localStreamRef.current;
      (peers || []).forEach((peerId) => createPeer(peerId, true, listenOnly));
    });

    socket.on("voice-user-joined", ({ socketId }) => {
      if (!socketId || socketId === socket.id) return;
      const listenOnly = !localStreamRef.current;
      createPeer(socketId, true, listenOnly);
    });

    socket.on("voice-offer", async ({ from, offer }) => {
      const listenOnly = !localStreamRef.current;
      const peer = createPeer(from, false, listenOnly);

      try {
        await peer.setRemoteDescription(new RTCSessionDescription(offer));
        await flushPendingIce(from);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);

        socket.emit("voice-answer", {
          target: from,
          answer: peer.localDescription,
        });
      } catch (error) {
        console.error("voice-offer handle error:", error);
      }
    });

    socket.on("voice-answer", async ({ from, answer }) => {
      const peer = peersRef.current[from];
      if (!peer) return;

      await peer.setRemoteDescription(new RTCSessionDescription(answer));
      await flushPendingIce(from);
    });

    socket.on("voice-ice-candidate", async ({ from, candidate }) => {
      const peer = peersRef.current[from];

      if (!peer || !peer.remoteDescription) {
        pendingIceRef.current[from] = [
          ...(pendingIceRef.current[from] || []),
          candidate,
        ];
        return;
      }

      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {}
    });

    socket.on("voice-user-left", ({ socketId }) => {
      removePeer(socketId);
      setVoiceUsers((prev) => {
        const next = (prev || []).filter((user) => user.socketId !== socketId);
        onVoiceUsersChange?.(normalizedVoiceUsers(next));
        return next;
      });
    });

    socket.on("voice-join-blocked", ({ roomCode: targetRoom, reason }) => {
      if (targetRoom && targetRoom !== roomCode) return;
      forceMutedByHostRef.current = true;
      setForceMutedByHost(true);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      stopLevelMeter();
      setVoiceLevels({});
      setIsVoiceOn(false);
      setIsMuted(false);
      isMutedRef.current = false;
      toast.error(reason || "Host herkesi susturdu. Mikrofon ayar açılınca aktif olur.");
    });

    socket.on("room-mute-all", ({ roomCode: targetRoom }) => {
      if (targetRoom && targetRoom !== roomCode) return;

      applyHostMuteAllLock();
      if (localStreamRef.current || isVoiceOnRef.current) {
        localStreamRef.current?.getAudioTracks?.().forEach((track) => {
          track.enabled = false;
        });
        isMutedRef.current = true;
        setIsMuted(true);
        setIsVoiceOn(true);
        updatePersistentVoiceStore({
          wanted: true,
          roomCode,
          username,
          stream: localStreamRef.current,
          muted: true,
          forceMuted: true,
        });
        if (roomCode) socket.emit("voice-mute-state", { roomCode, muted: true, forceMuted: true });
      }
      toast.success("Host herkesi susturdu 🔇");
    });

    socket.on("room-settings-updated", ({ roomCode: targetRoom, settings }) => {
      if (targetRoom && targetRoom !== roomCode) return;

      if (settings?.muteAll) {
        applyHostMuteAllLock();
        return;
      }

      forceMutedByHostRef.current = false;
      setForceMutedByHost(false);
    });

    function handleVoiceReconnect() {
      if (!roomCode || !localStreamRef.current) return;

      Object.values(peersRef.current).forEach((peer) => {
        try { peer.close(); } catch {}
      });
      peersRef.current = {};
      pendingIceRef.current = {};

      socket.emit("voice-join", {
        roomCode,
        username,
      });
    }

    function handleVoiceVisibilityRestore() {
      if (document.visibilityState !== "visible" || !roomCode) return;

      Object.values(audioRefs.current || {}).forEach((audio) => {
        try { audio.play?.().catch(() => {}); } catch {}
      });

      if (localStreamRef.current) {
        socket.emit("voice-join", {
          roomCode,
          username,
        });
      } else {
        ensureListening();
      }
    }

    function handleForcedVoiceLeave(event) {
      const targetRoom = event?.detail?.roomCode || currentRoomRef.current;
      if (targetRoom && currentRoomRef.current && targetRoom !== currentRoomRef.current) return;
      keepVoiceSessionRef.current = false;
      if (localStreamRef.current || isVoiceOnRef.current) {
        stopVoice();
      } else if (currentRoomRef.current) {
        socket.emit("voice-leave", { roomCode: currentRoomRef.current });
      }
    }

    socket.on("connect", handleVoiceReconnect);
    window.addEventListener("vory-force-voice-leave", handleForcedVoiceLeave);
    document.addEventListener("visibilitychange", handleVoiceVisibilityRestore);

    return () => {
      document.removeEventListener("visibilitychange", handleVoiceVisibilityRestore);
      window.removeEventListener("vory-force-voice-leave", handleForcedVoiceLeave);
      socket.off("voice-users");
      socket.off("voice-level-update");
      socket.off("voice-peers");
      socket.off("voice-user-joined");
      socket.off("voice-offer");
      socket.off("voice-answer");
      socket.off("voice-ice-candidate");
      socket.off("voice-user-left");
      socket.off("voice-join-blocked");
      socket.off("room-mute-all");
      socket.off("room-settings-updated");
      socket.off("connect");

      // Vory 5.5.3E.10.3: UI remount/tab geçişi voice'u kapatmasın.
      // Stream global store'a taşınır; yeni mount aynı stream'i geri alır.
      if (keepVoiceSessionRef.current && localStreamRef.current) {
        updatePersistentVoiceStore({
          wanted: true,
          roomCode: currentRoomRef.current,
          username,
          stream: localStreamRef.current,
          muted: isMutedRef.current,
          forceMuted: forceMutedByHostRef.current,
        });
      }

      // Vory 5.5.3E.10.8:
      // Component unmount/tab change gerçek voice çıkışı değildir. Stream ve wanted store korunur.
      // Gerçek çıkış sadece kullanıcının Çık butonu veya Home'un vory-force-voice-leave eventidir.
      if (!keepVoiceSessionRef.current && localStreamRef.current) {
        try {
          updatePersistentVoiceStore({
            wanted: true,
            roomCode: currentRoomRef.current,
            username,
            stream: localStreamRef.current,
            muted: isMutedRef.current,
            forceMuted: forceMutedByHostRef.current,
          });
        } catch {}
      }
    };
  }, [roomCode]);



  useEffect(() => {
    if (hostMuteAll) {
      // Vory 5.5.3E.10.3:
      // Host "mute all" aramadan atmaz; sadece mikrofon track'lerini kapatır.
      // Kullanıcı voice session içinde kalır, roster düşmez.
      forceMutedByHostRef.current = true;
      setForceMutedByHost(true);

      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
      }

      isMutedRef.current = true;
      setIsMuted(true);
      updatePersistentVoiceStore({
        wanted: !!(localStreamRef.current || isVoiceOnRef.current),
        roomCode,
        username,
        stream: localStreamRef.current,
        muted: true,
        forceMuted: true,
      });

      if (roomCode) {
        socket.emit("voice-mute-state", { roomCode, muted: true, forceMuted: true });
        socket.emit("get-voice-users", { roomCode });
      }
      return;
    }

    forceMutedByHostRef.current = false;
    setForceMutedByHost(false);
    updatePersistentVoiceStore({ forceMuted: false });
  }, [hostMuteAll, roomCode, username]);

  const activePersistentStore = getPersistentVoiceStore();
  const hasPersistentLiveTrack = !!activePersistentStore?.stream?.getAudioTracks?.().some((track) => track.readyState === "live");
  const isVoiceVisuallyOn = isVoiceOn || !!(activePersistentStore?.wanted && activePersistentStore?.roomCode === roomCode && hasPersistentLiveTrack);

  if (compact) {
    const locked = !!hostMuteAll || !!forceMutedByHost;

    return (
      <div className="vory-voice-compact-slot flex items-center justify-end overflow-hidden">
        {!isVoiceVisuallyOn ? (
          <button
            type="button"
            onClick={startVoice}
            disabled={locked}
            className={`vory-voice-chat-action inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition disabled:cursor-not-allowed disabled:opacity-55 ${
              locked
                ? "border border-white/10 bg-white/[0.055] text-white/35"
                : "bg-emerald-300 text-black shadow-[0_12px_36px_rgba(52,211,153,0.22)] hover:scale-[1.03]"
            }`}
            title={locked ? "Host Mute All açık" : "Voice'a katıl"}
            aria-label={locked ? "Mikrofon kilitli" : "Voice'a katıl"}
          >
            {locked ? <MicOff size={17} /> : <Mic size={17} />}
          </button>
        ) : (
          <button
            type="button"
            onClick={stopVoice}
            className="vory-voice-chat-action inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-red-300/20 bg-red-500/14 text-red-100 transition hover:bg-red-500/24"
            title="Voice'dan çık"
            aria-label="Voice'dan çık"
          >
            <PhoneOff size={16} />
          </button>
        )}
      </div>
    );
  }

  return (
    <section className="glass !rounded-[1.9rem] !border-white/8 !bg-black/22 shadow-[0_22px_80px_rgba(0,0,0,0.25)]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black">Voice</h2>
          <p className="mt-1 text-xs text-white/40">Voice party kontrolü.</p>
        </div>

        <div
          className={`rounded-2xl p-3 ${
            isVoiceOn ? "bg-emerald-500/15 text-emerald-300" : "bg-white/8 text-white/35"
          }`}
        >
          <Radio size={18} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-black/25 p-4">
          <p className="text-xs text-white/35">Bağlı Kişi</p>
          <p className="mt-1 text-2xl font-black">{participantCount()}</p>
        </div>

        <div className="rounded-3xl bg-black/25 p-4">
          <p className="text-xs text-white/35">Durum</p>
          <div className="mt-2 flex items-center gap-2 text-sm font-bold">
            <Activity size={15} className={isVoiceVisuallyOn ? "text-emerald-300" : "text-white/35"} />
            {isVoiceOn ? (forceMutedByHost ? "Host Susturdu" : isMuted ? "Sessiz" : "Aktif") : "Kapalı"}
          </div>
        </div>
      </div>

      {isVoiceVisuallyOn && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-white/35">
            Voice Channel
          </p>

          {normalizedVoiceUsers().length === 0 ? (
            <div className="rounded-2xl bg-black/25 p-3 text-sm text-white/35">
              Katılımcılar yükleniyor...
            </div>
          ) : (
            normalizedVoiceUsers().map((user) => {
              const level = voiceLevels[user.socketId] || 0;
              const speaking = !user.muted && level > 14;
              const isMe = user.socketId === socket.id;

              return (
                <div
                  key={user.socketId}
                  className={`rounded-2xl border p-3 transition-all duration-150 ${
                    speaking
                      ? "border-emerald-400/45 bg-emerald-400/10 shadow-[0_0_25px_rgba(52,211,153,0.18)]"
                      : "border-white/5 bg-black/25"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-black transition-all ${
                          speaking
                            ? "animate-pulse bg-emerald-400 text-black ring-4 ring-emerald-400/25"
                            : "bg-white/10 text-white"
                        }`}
                      >
                        {(user.username || "V").charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">
                          {user.username || "Kullanıcı"} {isMe ? "(Sen)" : ""}
                        </p>
                        <p className="text-xs text-white/35">
                          {user.muted ? "🔇 Sessiz" : speaking ? "🟢 Konuşuyor" : "🎙️ Dinliyor"}
                        </p>
                      </div>
                    </div>

                    <Volume2
                      size={16}
                      className={speaking ? "text-emerald-300" : "text-white/25"}
                    />
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full transition-all duration-150 ${
                        speaking ? "bg-emerald-300 shadow-[0_0_14px_rgba(52,211,153,0.7)]" : "bg-white/25"
                      }`}
                      style={{ width: `${Math.min(100, level)}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <div className="mt-4 hidden rounded-[1.75rem] border border-white/10 bg-black/30 p-3 lg:block">
        {!isVoiceOn ? (
          <button
            className="btn flex items-center justify-center gap-2"
            onClick={startVoice}
          >
            <Mic size={18} />
            Mikrofona Katıl
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              className="btn-secondary flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={toggleMute}
              disabled={forceMutedByHost}
              title={forceMutedByHost ? "Host Mute All açık" : ""}
            >
              <MicOff size={17} />
              {forceMutedByHost ? "Host Susturdu" : isMuted ? "Aç" : "Sustur"}
            </button>

            <button
              className="flex items-center justify-center gap-2 rounded-2xl bg-red-500/15 px-4 py-3 font-bold text-red-300 transition hover:bg-red-500/25"
              onClick={stopVoice}
            >
              <PhoneOff size={17} />
              Çık
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-[1.75rem] border border-emerald-300/10 bg-emerald-400/5 p-3 lg:hidden">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200/55">
              Mobile Voice Dock
            </p>
            <p className="mt-1 text-sm font-black text-white">
              {isVoiceOn ? (isMuted ? "Mikrofon sessiz" : "Mikrofon aktif") : "Voice kapalı"}
            </p>
          </div>

          <span className={`rounded-full px-3 py-1 text-[11px] font-black ${
            isVoiceOn
              ? isMuted
                ? "bg-amber-400/15 text-amber-200"
                : "bg-emerald-400/15 text-emerald-200"
              : "bg-white/8 text-white/35"
          }`}>
            {participantCount()} kişi
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={isVoiceOn ? toggleMute : startVoice}
            disabled={isVoiceOn && forceMutedByHost}
            className={`flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl border text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
              !isVoiceOn
                ? "border-emerald-300/20 bg-emerald-400/15 text-emerald-100"
                : isMuted || forceMutedByHost
                  ? "border-amber-300/20 bg-amber-400/15 text-amber-100"
                  : "border-emerald-300/25 bg-emerald-400/20 text-emerald-100 shadow-[0_0_24px_rgba(52,211,153,0.16)]"
            }`}
          >
            {isVoiceVisuallyOn && (isMuted || forceMutedByHost) ? <MicOff size={22} /> : <Mic size={22} />}
            <span>{!isVoiceOn ? "Katıl" : forceMutedByHost ? "Host" : isMuted ? "Aç" : "Mic"}</span>
          </button>

          <button
            type="button"
            onClick={() => sendQuickReaction("🔥")}
            className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl border border-orange-300/15 bg-orange-400/10 text-lg font-black text-orange-100 transition hover:bg-orange-400/20"
          >
            🔥
            <span className="text-[10px]">React</span>
          </button>

          <button
            type="button"
            onClick={() => sendQuickReaction("😂")}
            className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl border border-yellow-300/15 bg-yellow-400/10 text-lg font-black text-yellow-100 transition hover:bg-yellow-400/20"
          >
            😂
            <span className="text-[10px]">LOL</span>
          </button>

          <button
            type="button"
            onClick={isVoiceOn ? stopVoice : startVoice}
            className={`flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl border text-xs font-black transition ${
              isVoiceOn
                ? "border-red-300/20 bg-red-500/15 text-red-200 hover:bg-red-500/25"
                : "border-white/10 bg-white/8 text-white/55 hover:bg-white/12"
            }`}
          >
            {isVoiceOn ? <PhoneOff size={22} /> : <Radio size={22} />}
            <span>{isVoiceOn ? "Çık" : "Voice"}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
