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

export default function VoiceChat({ roomCode, username }) {
  const [isVoiceOn, setIsVoiceOn] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceUsers, setVoiceUsers] = useState([]);
  const [voiceLevels, setVoiceLevels] = useState({});

  const localStreamRef = useRef(null);
  const peersRef = useRef({});
  const audioRefs = useRef({});
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const levelIntervalRef = useRef(null);
  const isMutedRef = useRef(false);

  function participantCount() {
    return isVoiceOn ? Math.max(voiceUsers.length, 1) : 0;
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
      }, 120);
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

  function toggleMute() {
    const track = localStreamRef.current?.getAudioTracks()?.[0];
    if (!track) return;

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
    });

    socket.on("voice-ice-candidate", async ({ from, candidate }) => {
      const peer = peersRef.current[from];
      if (!peer) return;

      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {}
    });

    socket.on("voice-user-left", ({ socketId }) => {
      removePeer(socketId);
    });

    return () => {
      socket.off("voice-users");
      socket.off("voice-level-update");
      socket.off("voice-peers");
      socket.off("voice-user-joined");
      socket.off("voice-offer");
      socket.off("voice-answer");
      socket.off("voice-ice-candidate");
      socket.off("voice-user-left");

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
            {isVoiceOn ? (isMuted ? "Sessiz" : "Aktif") : "Kapalı"}
          </div>
        </div>
      </div>

      {isVoiceOn && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-white/35">
            Voice Channel
          </p>

          {voiceUsers.length === 0 ? (
            <div className="rounded-2xl bg-black/25 p-3 text-sm text-white/35">
              Katılımcılar yükleniyor...
            </div>
          ) : (
            voiceUsers.map((user) => {
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

      {!isVoiceOn ? (
        <button
          className="btn mt-4 flex items-center justify-center gap-2"
          onClick={startVoice}
        >
          <Mic size={18} />
          Mikrofona Katıl
        </button>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            className="btn-secondary flex items-center justify-center gap-2"
            onClick={toggleMute}
          >
            <MicOff size={17} />
            {isMuted ? "Aç" : "Sustur"}
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
    </section>
  );
}
