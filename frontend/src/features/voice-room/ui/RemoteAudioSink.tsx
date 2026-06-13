import { useEffect, useRef } from "react";

type RemoteAudioStream = {
  id: string;
  label: string;
  stream: MediaStream;
};

type Props = {
  muted?: boolean;
  streams: RemoteAudioStream[];
};

type AudioNodes = {
  gain: GainNode;
  source: MediaStreamAudioSourceNode;
  stream: MediaStream;
};

type AudioContextConstructor = typeof AudioContext;

function audioContextConstructor(): AudioContextConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  return window.AudioContext || (window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
}

class RemoteAudioSinkController {
  private readonly elements = new Map<string, HTMLAudioElement>();
  private readonly nodes = new Map<string, AudioNodes>();
  private audioContext?: AudioContext;
  private interactionHandler?: () => void;

  sync(streams: RemoteAudioStream[], muted: boolean): void {
    const activeIds = new Set(streams.map((stream) => stream.id));
    for (const id of Array.from(this.elements.keys())) {
      if (!activeIds.has(id)) this.detach(id);
    }
    for (const remote of streams) {
      this.attach(remote, muted);
    }
  }

  destroy(): void {
    for (const id of Array.from(this.elements.keys())) this.detach(id);
    this.removeInteractionHandler();
    void this.audioContext?.close().catch(() => undefined);
    this.audioContext = undefined;
  }

  private attach(remote: RemoteAudioStream, muted: boolean): void {
    if (typeof document === "undefined") return;
    const element = this.elements.get(remote.id) || this.createElement(remote);
    const streamChanged = element.srcObject !== remote.stream;
    element.setAttribute("aria-label", remote.label);
    if (streamChanged) element.srcObject = remote.stream;

    const context = this.ensureAudioContext();
    if (!context) {
      element.muted = muted;
      element.volume = muted ? 0 : 1;
      if (streamChanged || element.paused) this.play(element);
      return;
    }

    element.muted = true;
    element.volume = 0;
    const existing = this.nodes.get(remote.id);
    if (!existing || existing.stream !== remote.stream) {
      this.disconnectNodes(remote.id);
      const source = context.createMediaStreamSource(remote.stream);
      const gain = context.createGain();
      gain.gain.value = muted ? 0 : 1;
      source.connect(gain);
      gain.connect(context.destination);
      this.nodes.set(remote.id, { source, gain, stream: remote.stream });
    } else {
      existing.gain.gain.value = muted ? 0 : 1;
    }
    this.resumeAudioContext();
    if (streamChanged || element.paused) this.play(element);
  }

  private detach(id: string): void {
    this.disconnectNodes(id);
    const element = this.elements.get(id);
    if (!element) return;
    this.elements.delete(id);
    element.pause();
    element.srcObject = null;
    element.remove();
  }

  private disconnectNodes(id: string): void {
    const nodes = this.nodes.get(id);
    if (!nodes) return;
    try {
      nodes.source.disconnect();
      nodes.gain.disconnect();
    } catch {
      // Some browser shims throw when disconnecting already-disconnected nodes.
    }
    this.nodes.delete(id);
  }

  private ensureContainer(): HTMLElement {
    const existing = document.getElementById("matterhorn-chord-audio-sink");
    if (existing) return existing;
    const container = document.createElement("div");
    container.id = "matterhorn-chord-audio-sink";
    container.style.position = "fixed";
    container.style.left = "-9999px";
    container.style.bottom = "0";
    container.style.width = "1px";
    container.style.height = "1px";
    container.style.overflow = "hidden";
    document.body.appendChild(container);
    return container;
  }

  private createElement(remote: RemoteAudioStream): HTMLAudioElement {
    const element = document.createElement("audio");
    element.autoplay = true;
    element.controls = false;
    element.preload = "auto";
    element.setAttribute("aria-label", remote.label);
    (element as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
    this.ensureContainer().appendChild(element);
    this.elements.set(remote.id, element);
    return element;
  }

  private ensureAudioContext(): AudioContext | undefined {
    if (this.audioContext) return this.audioContext;
    const AudioContextCtor = audioContextConstructor();
    if (!AudioContextCtor) return undefined;
    try {
      this.audioContext = new AudioContextCtor();
      this.addInteractionHandler();
      return this.audioContext;
    } catch {
      return undefined;
    }
  }

  private resumeAudioContext(): void {
    if (this.audioContext?.state === "suspended") {
      void this.audioContext.resume().catch(() => undefined);
    }
  }

  private addInteractionHandler(): void {
    if (this.interactionHandler || typeof document === "undefined") return;
    this.interactionHandler = () => this.resumeAudioContext();
    document.addEventListener("click", this.interactionHandler);
    document.addEventListener("keydown", this.interactionHandler);
    document.addEventListener("touchstart", this.interactionHandler);
  }

  private removeInteractionHandler(): void {
    if (!this.interactionHandler || typeof document === "undefined") return;
    document.removeEventListener("click", this.interactionHandler);
    document.removeEventListener("keydown", this.interactionHandler);
    document.removeEventListener("touchstart", this.interactionHandler);
    this.interactionHandler = undefined;
  }

  private play(element: HTMLAudioElement): void {
    try {
      const result = element.play?.();
      if (result && typeof result.catch === "function") void result.catch(() => undefined);
    } catch {
      // Browsers may reject autoplay until a user gesture resumes the sink.
    }
  }
}

export function RemoteAudioSink({ muted = false, streams }: Props) {
  const sinkRef = useRef<RemoteAudioSinkController>();
  if (!sinkRef.current) sinkRef.current = new RemoteAudioSinkController();

  useEffect(() => () => {
    sinkRef.current?.destroy();
    sinkRef.current = undefined;
  }, []);

  useEffect(() => {
    sinkRef.current?.sync(streams, muted);
  }, [muted, streams]);

  return null;
}
