import { Monitor, MonitorOff, Radio, ScreenShare as ScreenShareIcon, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { socket } from "../services/socket";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

function canStartScreenShare() {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia;
}

function isMobileBrowser() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
}

export default function ScreenShare({ roomCode, username }) {
  const [isSharing, setIsSharing] = useState(false);
  const [activeBroadcaster, setActiveBroadcaster] = useState(null);
  const [broadcasterName, setBroadcasterName] = useState("");
  const [viewerCount, setViewerCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState("Kapalı");

  const localStreamRef = useRef(null);
  const peersRef = useRef({});
  const pendingIceRef = useRef({});
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const activeBroadcasterRef = useRef(null);

  function isMeBroadcaster() {
    return activeBroadcasterRef.current === socket.id;
  }

  function closePeer(peerId) {
    const peer = peersRef.current[peerId];

    delete pendingIceRef.current[peerId];

    if (peer) {
      try {
        peer.close();
      } catch {}

      delete peersRef.current[peerId];
    }

    setViewerCount(Object.keys(peersRef.current).length);
  }

  function closeAllPeers() {
    Object.values(peersRef.current).forEach((peer) => {
      try {
        peer.close();
      } catch {}
    });

    peersRef.current = {};
    pendingIceRef.current = {};
    setViewerCount(0);
  }

  function stopLocalTracks() {
    localStreamRef.current?.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {}
    });

    localStreamRef.current = null;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  }

  function clearRemoteVideo() {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  }

  function resetShareState() {
    closeAllPeers();
    clearRemoteVideo();
    stopLocalTracks();

    activeBroadcasterRef.current = null;
    setActiveBroadcaster(null);
    setBroadcasterName("");
    setIsSharing(false);
    setConnectionStatus("Kapalı");
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

  function requestActiveScreenShare() {
    if (!roomCode) return;

    socket.emit("request-screen-share-state", {
      roomCode,
    });
  }

  function createPeer(targetSocketId, initiator) {
    if (peersRef.current[targetSocketId]) {
      return peersRef.current[targetSocketId];
    }

    const peer = new RTCPeerConnection(ICE_SERVERS);

    if (initiator && localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        peer.addTrack(track, localStreamRef.current);
      });
    }

    peer.onicecandidate = (event) => {
      if (!event.candidate) return;

      socket.emit("screen-ice-candidate", {
        target: targetSocketId,
        candidate: event.candidate,
      });
    };

    peer.ontrack = (event) => {
      const [remoteStream] = event.streams;

      if (remoteVideoRef.current && remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play?.().catch(() => {});
        setConnectionStatus("Yayın izleniyor");
      }
    };

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") {
        setConnectionStatus(isMeBroadcaster() ? "Yayın aktif" : "Yayın izleniyor");
      }

      if (
        peer.connectionState === "failed" ||
        peer.connectionState === "disconnected" ||
        peer.connectionState === "closed"
      ) {
        closePeer(targetSocketId);
      }
    };

    peersRef.current[targetSocketId] = peer;
    setViewerCount(Object.keys(peersRef.current).length);

    if (initiator) {
      peer
        .createOffer()
        .then((offer) => peer.setLocalDescription(offer))
        .then(() => {
          socket.emit("screen-offer", {
            target: targetSocketId,
            offer: peer.localDescription,
          });
        })
        .catch(() => {
          closePeer(targetSocketId);
        });
    }

    return peer;
  }

  async function startScreenShare() {
    try {
      if (!roomCode) {
        toast.error("Önce bir odaya gir kanka.");
        return;
      }

      if (activeBroadcaster && activeBroadcaster !== socket.id) {
        toast.error("Odada zaten ekran paylaşımı var.");
        return;
      }

      if (!canStartScreenShare()) {
        toast.error("Bu cihazda ekran paylaşımı başlatılamıyor. Bilgisayardan paylaşım açabilirsin.");
        return;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: 30,
          cursor: "always",
        },
        audio: true,
      });

      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const videoTrack = stream.getVideoTracks()[0];

      if (videoTrack) {
        videoTrack.onended = () => {
          stopScreenShare(true);
        };
      }

      activeBroadcasterRef.current = socket.id;
      setActiveBroadcaster(socket.id);
      setBroadcasterName(username || "Sen");
      setIsSharing(true);
      setConnectionStatus("Yayın aktif");

      socket.emit("screen-share-start", {
        roomCode,
        username,
      });

      toast.success("Ekran paylaşımı başladı 📺");
    } catch (error) {
      toast.error("Ekran paylaşımı başlatılamadı.");
    }
  }

  function stopScreenShare(shouldNotifyServer = true) {
    if (shouldNotifyServer && roomCode && isMeBroadcaster()) {
      socket.emit("screen-share-stop", { roomCode });
    }

    resetShareState();
  }

  useEffect(() => {
    function handleShareStarted({ broadcaster, username: shareUsername }) {
      activeBroadcasterRef.current = broadcaster;
      setActiveBroadcaster(broadcaster);
      setBroadcasterName(shareUsername || "Kullanıcı");

      if (broadcaster === socket.id) {
        setIsSharing(true);
        setConnectionStatus("Yayın aktif");
        return;
      }

      closeAllPeers();
      clearRemoteVideo();
      setConnectionStatus("Yayına bağlanılıyor");

      socket.emit("request-screen-stream", {
        roomCode,
        broadcaster,
      });

      setTimeout(() => {
        if (!remoteVideoRef.current?.srcObject) {
          socket.emit("request-screen-stream", { roomCode, broadcaster, retry: true });
        }
      }, 1800);
    }

    function handleShareStopped() {
      resetShareState();
      toast.success("Ekran paylaşımı durdu.");
    }

    function handleViewerJoined({ viewer }) {
      if (!localStreamRef.current || !isMeBroadcaster()) return;
      createPeer(viewer, true);
    }

    async function handleScreenOffer({ from, offer }) {
      try {
        if (activeBroadcasterRef.current && activeBroadcasterRef.current !== from) return;

        const peer = createPeer(from, false);

        await peer.setRemoteDescription(new RTCSessionDescription(offer));
        await flushPendingIce(from);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);

        socket.emit("screen-answer", {
          target: from,
          answer: peer.localDescription,
        });
      } catch {
        closePeer(from);
      }
    }

    async function handleScreenAnswer({ from, answer }) {
      try {
        const peer = peersRef.current[from];
        if (!peer) return;

        await peer.setRemoteDescription(new RTCSessionDescription(answer));
        await flushPendingIce(from);
      } catch {
        closePeer(from);
      }
    }

    async function handleIceCandidate({ from, candidate }) {
      try {
        const peer = peersRef.current[from];

        if (!peer || !peer.remoteDescription) {
          pendingIceRef.current[from] = [
            ...(pendingIceRef.current[from] || []),
            candidate,
          ];
          return;
        }

        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {}
    }

    function handleShareState(payload = {}) {
      if (payload.active === false) {
        resetShareState();
      }
    }

    function handleShareError(message) {
      toast.error(message || "Ekran paylaşımı hatası.");
      resetShareState();
    }

    socket.on("screen-share-started", handleShareStarted);
    socket.on("screen-share-stopped", handleShareStopped);
    socket.on("screen-viewer-joined", handleViewerJoined);
    socket.on("screen-offer", handleScreenOffer);
    socket.on("screen-answer", handleScreenAnswer);
    socket.on("screen-ice-candidate", handleIceCandidate);
    socket.on("screen-share-state", handleShareState);
    socket.on("screen-share-error", handleShareError);
    socket.on("connect", requestActiveScreenShare);

    requestActiveScreenShare();

    const handleSocketReconnect = () => {
      requestActiveScreenShare();
    };

    socket.on("connect", handleSocketReconnect);

    return () => {
      socket.off("screen-share-started", handleShareStarted);
      socket.off("screen-share-stopped", handleShareStopped);
      socket.off("screen-viewer-joined", handleViewerJoined);
      socket.off("screen-offer", handleScreenOffer);
      socket.off("screen-answer", handleScreenAnswer);
      socket.off("screen-ice-candidate", handleIceCandidate);
      socket.off("screen-share-state", handleShareState);
      socket.off("screen-share-error", handleShareError);
      socket.off("connect", requestActiveScreenShare);
      socket.off("connect", handleSocketReconnect);

      if (isMeBroadcaster() && roomCode) {
        socket.emit("screen-share-stop", { roomCode });
      }

      resetShareState();
    };
  }, [roomCode, username]);

  if (!roomCode) {
    return (
      <section className="glass">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black">Ekran Paylaşımı</h2>
            <p className="mt-1 text-xs text-white/40">Odaya girince aktif olur.</p>
          </div>

          <div className="rounded-2xl bg-white/8 p-3 text-white/35">
            <Monitor size={18} />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="glass overflow-hidden border-white/10 bg-white/[0.045]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black">Ekran Paylaşımı</h2>
            {activeBroadcaster && (
              <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-black text-emerald-300">
                LIVE
              </span>
            )}
          </div>

          <p className="mt-1 text-xs text-white/40">
            Tek yayıncı, oda içi WebRTC ekran paylaşımı.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-bold text-white/55 sm:flex">
          <div className="flex items-center gap-2 rounded-2xl bg-black/25 px-3 py-2">
            <Radio size={14} className={activeBroadcaster ? "text-emerald-300" : "text-white/30"} />
            {connectionStatus}
          </div>

          <div className="flex items-center gap-2 rounded-2xl bg-black/25 px-3 py-2">
            <Users size={14} />
            {isSharing ? viewerCount : activeBroadcaster ? "İzleyici" : "0"}
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-[2rem] border border-white/10 bg-black/35">
        {isSharing ? (
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="aspect-video max-h-[58vh] w-full bg-black object-contain"
          />
        ) : activeBroadcaster ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            controls
            className="aspect-video max-h-[58vh] w-full bg-black object-contain"
          />
        ) : (
          <div className="flex aspect-video max-h-[58vh] flex-col items-center justify-center gap-3 text-white/35">
            <ScreenShareIcon size={42} />
            <p className="text-sm font-bold">Şu an aktif ekran paylaşımı yok.</p>
          </div>
        )}
      </div>

      {activeBroadcaster && !isSharing && (
        <p className="mt-3 text-xs text-white/40">
          Yayıncı: <span className="font-bold text-white/70">{broadcasterName}</span>
        </p>
      )}

      {!isSharing ? (
        <div className="mt-4">
          {isMobileBrowser() && !canStartScreenShare() ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-xs font-bold text-white/45">
              📱 Mobilde ekran paylaşımı başlatma desteklenmiyor. Bilgisayardan paylaşım açabilir, mobilde yayını izleyebilirsin.
            </div>
          ) : (
            <button
              className="btn mt-0 flex items-center justify-center gap-2"
              onClick={startScreenShare}
              disabled={!!activeBroadcaster && activeBroadcaster !== socket.id}
            >
              <Monitor size={18} />
              Ekran Paylaş
            </button>
          )}
        </div>
      ) : (
        <button
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500/15 px-4 py-3 font-bold text-red-300 transition hover:bg-red-500/25"
          onClick={() => stopScreenShare(true)}
        >
          <MonitorOff size={18} />
          Yayını Durdur
        </button>
      )}
    </section>
  );
}
