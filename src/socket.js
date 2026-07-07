import { io } from "socket.io-client";

export function createGameSocket() {
  return io(getSocketUrl(), {
    transports: ["websocket"],
  });
}

function getSocketUrl() {
  if (import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL;
  }
  if (window.location.port === "5173") {
    return `${window.location.protocol}//${window.location.hostname}:3001`;
  }
  return window.location.origin;
}
