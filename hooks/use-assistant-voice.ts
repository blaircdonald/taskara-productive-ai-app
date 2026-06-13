"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AssistantVoiceStatus = "idle" | "connecting" | "listening" | "speaking" | "processing" | "error";

type VoiceOptions = {
  threadId: number | null;
  context: string;
  tools: unknown[];
  onTranscript: (role: "user" | "assistant", text: string) => void;
  onResult: () => void;
};

const RATE = 24000;

function bytesToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
  return btoa(binary);
}

export function useAssistantVoice({ threadId, context, tools, onTranscript, onResult }: VoiceOptions) {
  const [status, setStatus] = useState<AssistantVoiceStatus>("idle");
  const [error, setError] = useState("");
  const socketRef = useRef<WebSocket | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const nextPlayRef = useRef(0);
  const pendingToolsRef = useRef<{ callId: string; result: unknown }[]>([]);
  const lastEventRef = useRef("");
  const callbacksRef = useRef({ onTranscript, onResult });
  callbacksRef.current = { onTranscript, onResult };

  const flushPlayback = useCallback(() => {
    sourcesRef.current.forEach((source) => { try { source.stop(); source.disconnect(); } catch {} });
    sourcesRef.current.clear();
    nextPlayRef.current = audioRef.current?.currentTime ?? 0;
  }, []);

  const cleanup = useCallback((clean = true) => {
    const socket = socketRef.current;
    if (clean && socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "session.end" }));
    socketRef.current = null;
    socket?.close();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    flushPlayback();
    const audio = audioRef.current;
    audioRef.current = null;
    if (audio && audio.state !== "closed") void audio.close();
    pendingToolsRef.current = [];
    setStatus("idle");
  }, [flushPlayback]);

  const flushTools = useCallback(() => {
    const socket = socketRef.current;
    if (lastEventRef.current !== "reply.done" || socket?.readyState !== WebSocket.OPEN) return;
    pendingToolsRef.current.splice(0).forEach((tool) => socket.send(JSON.stringify({ type: "tool.result", call_id: tool.callId, result: JSON.stringify(tool.result) })));
  }, []);

  const start = useCallback(async () => {
    if (!threadId || (status !== "idle" && status !== "error")) return;
    setError("");
    setStatus("connecting");
    try {
      const tokenResponse = await fetch("/api/assistant/voice-token", { method: "POST" });
      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok || !tokenData.token) throw new Error(tokenData.error || "Could not start Voice Assistant.");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: true } });
      streamRef.current = stream;
      const audio = new AudioContext();
      audioRef.current = audio;
      await audio.resume();
      const workletCode = `
        class AssistantPcm extends AudioWorkletProcessor {
          constructor(options) { super(); this.ratio = sampleRate / 24000; }
          process(inputs) {
            const input = inputs[0] && inputs[0][0];
            if (!input) return true;
            const length = Math.floor(input.length / this.ratio);
            const output = new Int16Array(length);
            for (let i = 0; i < length; i++) {
              const sample = input[Math.floor(i * this.ratio)] || 0;
              output[i] = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
            }
            this.port.postMessage(output.buffer, [output.buffer]);
            return true;
          }
        }
        registerProcessor("assistant-pcm", AssistantPcm);
      `;
      const workletUrl = URL.createObjectURL(new Blob([workletCode], { type: "application/javascript" }));
      await audio.audioWorklet.addModule(workletUrl);
      URL.revokeObjectURL(workletUrl);
      const source = audio.createMediaStreamSource(stream);
      const worklet = new AudioWorkletNode(audio, "assistant-pcm");
      const silence = audio.createGain();
      silence.gain.value = 0;
      source.connect(worklet).connect(silence).connect(audio.destination);

      const url = new URL("wss://agents.assemblyai.com/v1/ws");
      url.searchParams.set("token", tokenData.token);
      const socket = new WebSocket(url);
      socketRef.current = socket;
      let ready = false;
      worklet.port.onmessage = ({ data }) => {
        if (ready && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "input.audio", audio: bytesToBase64(data) }));
      };
      socket.onopen = () => socket.send(JSON.stringify({
        type: "session.update",
        session: {
          system_prompt: `You are Taskara's friendly voice productivity assistant. Keep spoken replies concise. Ask for missing dates, times, or target names before using tools. Never invent ids; use search_workspace first. Never delete, archive, or clear anything. Recent conversation: ${context.slice(-6000)}`,
          greeting: "Hi, what would you like to get done?",
          output: { type: "audio", voice: "ivy" },
          input: { turn_detection: { vad_threshold: 0.5, min_silence: 1400, max_silence: 4000, interrupt_response: true } },
          tools,
        },
      }));
      socket.onmessage = async ({ data }) => {
        const message = JSON.parse(data);
        lastEventRef.current = message.type;
        if (message.type === "session.ready") { ready = true; setStatus("listening"); }
        if (message.type === "input.speech.started") { flushPlayback(); setStatus("listening"); }
        if (message.type === "input.speech.stopped") setStatus("processing");
        if (message.type === "reply.started") setStatus("speaking");
        if (message.type === "reply.audio") {
          const raw = atob(message.data);
          const pcm = new Int16Array(raw.length / 2);
          for (let index = 0; index < pcm.length; index += 1) pcm[index] = raw.charCodeAt(index * 2) | (raw.charCodeAt(index * 2 + 1) << 8);
          const buffer = audio.createBuffer(1, pcm.length, RATE);
          const channel = buffer.getChannelData(0);
          for (let index = 0; index < pcm.length; index += 1) channel[index] = pcm[index] / 32768;
          const playback = audio.createBufferSource();
          playback.buffer = buffer;
          playback.connect(audio.destination);
          const startAt = Math.max(audio.currentTime, nextPlayRef.current);
          playback.start(startAt);
          nextPlayRef.current = startAt + buffer.duration;
          sourcesRef.current.add(playback);
          playback.onended = () => sourcesRef.current.delete(playback);
        }
        if (message.type === "reply.done") {
          if (message.status === "interrupted") { pendingToolsRef.current = []; flushPlayback(); }
          else flushTools();
          setStatus("listening");
        }
        if (message.type === "transcript.user" || message.type === "transcript.agent") {
          const role = message.type === "transcript.agent" ? "assistant" : "user";
          const text = String(message.text || "").trim();
          if (text) {
            callbacksRef.current.onTranscript(role, text);
            await fetch("/api/assistant/voice-event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "transcript", threadId, role, text }) });
          }
        }
        if (message.type === "tool.call") {
          setStatus("processing");
          const response = await fetch("/api/assistant/voice-event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "tool", threadId, name: message.name, arguments: message.arguments }) });
          const result = await response.json();
          pendingToolsRef.current.push({ callId: message.call_id, result: response.ok ? result.result : { error: result.error || "Tool failed" } });
          callbacksRef.current.onResult();
          flushTools();
        }
        if (message.type === "session.error" || message.type === "error") throw new Error(message.message || "Voice Assistant error.");
      };
      socket.onerror = () => { setError("Voice connection failed. Try again."); setStatus("error"); };
      socket.onclose = () => { if (socketRef.current === socket) cleanup(false); };
    } catch (cause) {
      cleanup(false);
      setError(cause instanceof DOMException && cause.name === "NotAllowedError" ? "Microphone permission was denied." : cause instanceof Error ? cause.message : "Could not start Voice Assistant.");
      setStatus("error");
    }
  }, [cleanup, context, flushPlayback, flushTools, status, threadId, tools]);

  useEffect(() => () => cleanup(true), [cleanup]);
  return { status, error, start, stop: () => cleanup(true) };
}
