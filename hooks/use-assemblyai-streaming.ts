"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AssemblyAIStreamingStatus = "idle" | "connecting" | "recording" | "stopping" | "error";

type TurnMessage = {
  type: "Turn";
  turn_order: number;
  transcript?: string;
  end_of_turn?: boolean;
};

type UseAssemblyAIStreamingOptions = {
  onFinalTranscript: (text: string) => void;
};

const STREAMING_URL = "wss://streaming.assemblyai.com/v3/ws";
const MAX_RECORDING_DURATION_MS = 2 * 60 * 1000;

function toPcm16(input: Float32Array) {
  const output = new Int16Array(input.length);
  for (let index = 0; index < input.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, input[index]));
    output[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return output.buffer;
}

export function useAssemblyAIStreaming({ onFinalTranscript }: UseAssemblyAIStreamingOptions) {
  const [status, setStatus] = useState<AssemblyAIStreamingStatus>("idle");
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const statusRef = useRef<AssemblyAIStreamingStatus>("idle");
  const callbackRef = useRef(onFinalTranscript);
  const socketRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const silenceRef = useRef<GainNode | null>(null);
  const finalizedTurnsRef = useRef(new Set<number>());
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  callbackRef.current = onFinalTranscript;

  const updateStatus = useCallback((next: AssemblyAIStreamingStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const releaseAudio = useCallback(() => {
    if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
    sessionTimerRef.current = null;
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    silenceRef.current?.disconnect();
    processorRef.current = null;
    sourceRef.current = null;
    silenceRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    const audioContext = audioContextRef.current;
    audioContextRef.current = null;
    if (audioContext && audioContext.state !== "closed") void audioContext.close();
  }, []);

  const closeSocket = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
    const socket = socketRef.current;
    socketRef.current = null;
    if (socket && socket.readyState < WebSocket.CLOSING) socket.close();
  }, []);

  const stopRecording = useCallback(() => {
    if (statusRef.current === "idle" || statusRef.current === "stopping") return;
    requestIdRef.current += 1;
    updateStatus("stopping");
    releaseAudio();
    setPreview("");
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "Terminate" }));
      closeTimerRef.current = setTimeout(() => {
        closeSocket();
        updateStatus("idle");
      }, 1500);
    } else {
      closeSocket();
      updateStatus("idle");
    }
  }, [closeSocket, releaseAudio, updateStatus]);

  const fail = useCallback((message: string) => {
    requestIdRef.current += 1;
    releaseAudio();
    closeSocket();
    setPreview("");
    setError(message);
    updateStatus("error");
  }, [closeSocket, releaseAudio, updateStatus]);

  const startRecording = useCallback(async () => {
    if (statusRef.current === "connecting" || statusRef.current === "recording") return;
    setError("");
    setPreview("");
    finalizedTurnsRef.current.clear();
    updateStatus("connecting");
    const requestId = ++requestIdRef.current;

    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Microphone access is not supported in this browser.");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      if (requestId !== requestIdRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;

      const tokenResponse = await fetch("/api/assemblyai/token", { method: "POST" });
      const tokenData = (await tokenResponse.json()) as { token?: string; error?: string };
      if (!tokenResponse.ok || !tokenData.token) throw new Error(tokenData.error || "Could not start voice transcription.");
      if (requestId !== requestIdRef.current) return;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      if (audioContext.state === "suspended") await audioContext.resume();
      if (requestId !== requestIdRef.current) return;
      const params = new URLSearchParams({
        token: tokenData.token,
        speech_model: "universal-streaming-english",
        sample_rate: String(audioContext.sampleRate),
        format_turns: "true",
      });
      const socket = new WebSocket(`${STREAMING_URL}?${params.toString()}`);
      socketRef.current = socket;
      socket.binaryType = "arraybuffer";

      socket.onopen = () => {
        if (statusRef.current !== "connecting") return;
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        const silence = audioContext.createGain();
        silence.gain.value = 0;
        source.connect(processor);
        processor.connect(silence);
        silence.connect(audioContext.destination);
        sourceRef.current = source;
        processorRef.current = processor;
        silenceRef.current = silence;
        processor.onaudioprocess = (event) => {
          if (socket.readyState !== WebSocket.OPEN) return;
          socket.send(toPcm16(event.inputBuffer.getChannelData(0)));
        };
        updateStatus("recording");
        sessionTimerRef.current = setTimeout(stopRecording, MAX_RECORDING_DURATION_MS);
      };

      socket.onmessage = (event) => {
        if (typeof event.data !== "string") return;
        const message = JSON.parse(event.data) as { type?: string } | TurnMessage;
        if (message.type !== "Turn") return;
        const turn = message as TurnMessage;
        const transcript = turn.transcript?.trim() || "";
        setPreview(turn.end_of_turn ? "" : transcript);
        if (turn.end_of_turn && transcript && !finalizedTurnsRef.current.has(turn.turn_order)) {
          finalizedTurnsRef.current.add(turn.turn_order);
          callbackRef.current(transcript);
        }
      };

      socket.onerror = () => {
        if (socketRef.current === socket && statusRef.current !== "stopping") fail("Voice transcription connection failed. Try again.");
      };
      socket.onclose = () => {
        if (socketRef.current !== socket) return;
        releaseAudio();
        socketRef.current = null;
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
        setPreview("");
        if (statusRef.current !== "error") updateStatus("idle");
      };
    } catch (cause) {
      const message = cause instanceof DOMException && cause.name === "NotAllowedError"
        ? "Microphone permission was denied. Allow microphone access to use Speak to Note."
        : cause instanceof Error ? cause.message : "Could not start voice transcription.";
      if (requestId === requestIdRef.current) fail(message);
    }
  }, [fail, releaseAudio, stopRecording, updateStatus]);

  useEffect(() => () => {
    requestIdRef.current += 1;
    releaseAudio();
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "Terminate" }));
    closeSocket();
  }, [closeSocket, releaseAudio]);

  return { status, preview, error, startRecording, stopRecording };
}
