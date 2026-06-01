import { Mic, MicOff, PhoneOff, Radio, Activity } from "lucide-react";
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
  const [participantCount, setParticipantCount] = useState(0);
  const localStreamRef = useRef(null);
  const peersRef = useRef({});
  const audioRefs = useRef({});

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
      setIsVoiceOn(true);
      setIsMuted(false);

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

    socket.emit("voice-leave", { roomCode });

    setParticipantCount(0);
    setIsVoiceOn(false);
    setIsMuted(false);
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
    setParticipantCount(Object.keys(peersRef.current).length);

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

    setParticipantCount(Object.keys(peersRef.current).length);
  }

  function toggleMute() {
    const track = localStreamRef.current?.getAudioTracks()?.[0];
    if (!track) return;

    track.enabled = !track.enabled;
    setIsMuted(!track.enabled);
    toast.success(track.enabled ? "Mikrofon açıldı" : "Mikrofon kapandı");
  }

  useEffect(() => {
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
      socket.off("voice-peers");
      socket.off("voice-user-joined");
      socket.off("voice-offer");
      socket.off("voice-answer");
      socket.off("voice-ice-candidate");
      socket.off("voice-user-left");

      if (localStreamRef.current) stopVoice();
    };
  }, [roomCode]);

  return (
    <section className="glass">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black">Sesli Sohbet</h2>
          <p className="mt-1 text-xs text-white/40">
            Odadakilerle mikrofon üzerinden konuş.
          </p>
        </div>

        <div className={`rounded-2xl p-3 ${isVoiceOn ? "bg-emerald-500/15 text-emerald-300" : "bg-white/8 text-white/35"}`}>
          <Radio size={18} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-black/25 p-4">
          <p className="text-xs text-white/35">Bağlı Kişi</p>
          <p className="mt-1 text-2xl font-black">
            {isVoiceOn ? participantCount + 1 : 0}
          </p>
        </div>

        <div className="rounded-3xl bg-black/25 p-4">
          <p className="text-xs text-white/35">Durum</p>
          <div className="mt-2 flex items-center gap-2 text-sm font-bold">
            <Activity size={15} className={isVoiceOn ? "text-emerald-300" : "text-white/35"} />
            {isVoiceOn ? (isMuted ? "Sessiz" : "Aktif") : "Kapalı"}
          </div>
        </div>
      </div>

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
