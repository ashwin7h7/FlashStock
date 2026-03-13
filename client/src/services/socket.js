import { io } from "socket.io-client";

const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL || "http://localhost:4000").replace(/\/$/, "");

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, { autoConnect: false });
  }
  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
};

export const disconnectSocket = () => {
  if (socket && socket.connected) {
    socket.disconnect();
  }
};
