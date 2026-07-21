import { io, Socket } from "socket.io-client";

const isProd = typeof window !== "undefined" && (window.location.hostname.includes("onrender.com") || window.location.hostname.includes("vercel.app"));
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 
  (isProd ? "https://codealpha-projectmanagementtool-0rio.onrender.com" : "http://localhost:5000");

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect();
  }
  socket = null;
}
