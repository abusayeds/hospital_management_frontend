"use client";

import { useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { SOCKET_URL } from "./api";

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  // withCredentials sends the auth cookie, so the server knows which events this user may receive
  socket ??= io(SOCKET_URL, { transports: ["websocket", "polling"], withCredentials: true });
  return socket;
};

// Re-run `onEvent` whenever any of the given backend events arrives
export function useLiveEvents(events: string[], onEvent: () => void) {
  useEffect(() => {
    const s = getSocket();
    events.forEach((e) => s.on(e, onEvent));
    return () => {
      events.forEach((e) => s.off(e, onEvent));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onEvent, events.join(",")]);
}
