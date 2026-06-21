import React from "react";

export function ChatLoading(props: { roomName: string; message: string; status: string }) {
  return (
    <main className="chat-loading-shell">
      <section className="chat-loading-panel" aria-live="polite">
        <span className={`connection-state ${props.status}`}>{props.status}</span>
        <h1>Mosh</h1>
        <p>{props.roomName}</p>
        <p>{props.message}</p>
      </section>
    </main>
  );
}
