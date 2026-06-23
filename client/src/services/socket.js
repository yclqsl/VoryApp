import { io } from "socket.io-client";

const SOCKET_URL = "https://voryapp.onrender.com";

const socketOptions = {
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500,
  reconnectionDelayMax: 5000,
  randomizationFactor: 0.35,
  timeout: 20000,
  autoConnect: true,
  forceNew: false,
  multiplex: true,
  upgrade: true,
};

const globalSocketKey = "__voryAppSocket";

export const socket =
  typeof window !== "undefined"
    ? (window[globalSocketKey] ||= io(SOCKET_URL, socketOptions))
    : io(SOCKET_URL, socketOptions);

try {
  socket.io.opts = {
    ...socket.io.opts,
    ...socketOptions,
  };
} catch {}
