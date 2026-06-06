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

export default function VoiceChat({ roomCode, username, onReaction }) {
  const [isVoiceOn, setIsVoiceOn] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
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
  const isMutedRef = useRef(false);
  const forceMutedByHostRef = useRef(false);

  function getVisibleVoiceUsers() {
    if (!isVoiceOn) return [];

    const selfUser = {
      socketId: socket.id,
      username,
      muted: isMuted,
      level: voiceLevels?.[socket.id] || 0,
      isSelf: true,
    };

    const remoteUsers = (voiceUsers || []).filter((user) => user?.socketId !== socket.id);
    return [selfUser, ...remoteUsers];
  }

  function participantCount() {
    return getVisibleVoiceUsers().length;
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
      }, 300);
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
    try {
      if (!roomCode) {
        toast.error("Önce bir odaya gir.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      localStreamRef.current = stream;
      isMutedRef.current = false;
      setIsVoiceOn(true);
      setIsMuted(false);

      startLevelMeter(stream);

      socket.emit("voice-join", {
        roomCode,
        username,
      });

      toast.success("Mikrofon açıldı 🎙️");
    } catch (error) {
      toast.error("Mikrofon izni alınamadı.");
    }
  }

  function stopVoice() {
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

    stopLevelMeter();

    socket.emit("voice-leave", { roomCode });

    setVoiceUsers([]);
    setVoiceLevels({});
    setIsVoiceOn(false);
    setIsMuted(false);
    isMutedRef.current = false;

    toast.success("Mikrofon kapatıldı.");
  }

  function createPeer(targetSocketId, initiator) {
    if (peersRef.current[targetSocketId]) {
      return peersRef.current[targetSocketId];
    }

    const peer = new RTCPeerConnection(ICE_SERVERS);

    localStreamRef.current?.getTracks().forEach((track) => {
      peer.addTrack(track, localStreamRef.current);
    });

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

      if (!audioRefs.current[targetSocketId]) {
        const audio = document.createElement("audio");
        audio.autoplay = true;
        audio.playsInline = true;
        audio.srcObject = remoteStream;
        audio.play?.().catch(() => {});
        document.body.appendChild(audio);
        audioRefs.current[targetSocketId] = audio;
      }
    };

    peer.onconnectionstatechange = () => {
      if (
        peer.connectionState === "failed" ||
        peer.connectionState === "disconnected" ||
        peer.connectionState === "closed"
      ) {
        removePeer(targetSocketId);
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
    window.dispatchEvent(new CustomEvent("vory:voice-state", {
      detail: {
        roomCode,
        isOn: isVoiceOn,
        users: getVisibleVoiceUsers(),
      },
    }));
  }, [roomCode, isVoiceOn, isMuted, username, voiceUsers, voiceLevels]);

  useEffect(() => {
    socket.on("voice-users", ({ users }) => {
      const safeUsers = users || [];
      setVoiceUsers(safeUsers);

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
      if (!localStreamRef.current) return;
      (peers || []).forEach((peerId) => createPeer(peerId, true));
    });

    socket.on("voice-user-joined", ({ socketId }) => {
      if (!localStreamRef.current) return;
      createPeer(socketId, false);
    });

    socket.on("voice-offer", async ({ from, offer }) => {
      if (!localStreamRef.current) return;

      const peer = createPeer(from, false);

      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      await flushPendingIce(from);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      socket.emit("voice-answer", {
        target: from,
        answer: peer.localDescription,
      });
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
    });

    socket.on("room-mute-all", ({ roomCode: targetRoom }) => {
      if (targetRoom && targetRoom !== roomCode) return;

      applyHostMuteAllLock();
      toast.success("Host tarafından susturuldun 🔇");
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

    socket.on("connect", handleVoiceReconnect);

    return () => {
      socket.off("voice-users");
      socket.off("voice-level-update");
      socket.off("voice-peers");
      socket.off("voice-user-joined");
      socket.off("voice-offer");
      socket.off("voice-answer");
      socket.off("voice-ice-candidate");
      socket.off("voice-user-left");
      socket.off("room-mute-all");
      socket.off("room-settings-updated");
      socket.off("connect");

      if (localStreamRef.current) {
        stopVoice();
      }
    };
  }, [roomCode]);

  return (
    <section className="glass">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black">Sesli Sohbet</h2>
          <p className="mt-1 text-xs text-white/40">
            Konuşan kişi canlı glow ve ses barıyla görünür.
          </p>
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
            <Activity size={15} className={isVoiceOn ? "text-emerald-300" : "text-white/35"} />
            {isVoiceOn ? (forceMutedByHost ? "Host Susturdu" : isMuted ? "Sessiz" : "Aktif") : "Kapalı"}
          </div>
        </div>
      </div>

      {isVoiceOn && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-white/35">
            Voice Channel
          </p>

          {getVisibleVoiceUsers().length === 0 ? (
            <div className="rounded-2xl bg-black/25 p-3 text-sm text-white/35">
              Katılımcılar yükleniyor...
            </div>
          ) : (
            getVisibleVoiceUsers().map((user) => {
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
            {isVoiceOn && (isMuted || forceMutedByHost) ? <MicOff size={22} /> : <Mic size={22} />}
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
