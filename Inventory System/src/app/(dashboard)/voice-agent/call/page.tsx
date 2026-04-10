"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const VOICE_API_URL =
  process.env.NEXT_PUBLIC_VOICE_API_URL ||
  "https://shopflow-voice-agent.onrender.com";

interface Message {
  role: "user" | "agent";
  text: string;
  tools?: string[];
  timestamp: Date;
  audioUrl?: string;
}

type CallState = "idle" | "listening" | "processing" | "speaking";

export default function VoiceCallPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [callState, setCallState] = useState<CallState>("idle");
  const [sessionId] = useState(() => `voice-${Date.now()}`);
  const [isCallActive, setIsCallActive] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioUrlsRef = useRef<string[]>([]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, transcript]);

  // Cleanup audio URLs on unmount
  useEffect(() => {
    const urls = audioUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // Use ref for sendToAgent so startListening can call it without circular dep
  const sendToAgentRef = useRef<(text: string) => Promise<void>>();

  const startListening = useCallback(() => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      setError("Speech recognition not supported. Use Chrome or Edge.");
      return;
    }

    const SpeechRecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript;
        } else {
          interimText += event.results[i][0].transcript;
        }
      }
      setTranscript(finalText || interimText);
    };

    recognition.onend = () => {
      setTranscript((current) => {
        if (current.trim()) {
          sendToAgentRef.current?.(current.trim());
        } else {
          setCallState("idle");
        }
        return "";
      });
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "no-speech") {
        setCallState((prev) => (prev === "listening" ? "idle" : prev));
        return;
      }
      if (event.error === "aborted") return;
      console.error("Speech recognition error:", event.error);
      setError(`Mic error: ${event.error}. Check permissions.`);
      setCallState("idle");
    };

    recognitionRef.current = recognition;
    recognition.start();
    setCallState("listening");
    setTranscript("");
    setError(null);
  }, []);

  const sendToAgent = async (text: string) => {
    setCallState("processing");

    setMessages((prev) => [
      ...prev,
      { role: "user", text, timestamp: new Date() },
    ]);

    try {
      const res = await fetch(`${VOICE_API_URL}/api/v1/voice-demo/talk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          session_id: sessionId,
        }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const replyText = res.headers.get("X-Reply-Text") || "";
      const toolsUsed = res.headers.get("X-Tools-Used")?.split(",").filter(Boolean) || [];

      // Get audio blob
      const audioBlob = await res.blob();
      let audioUrl: string | undefined;

      if (audioBlob.size > 0 && audioBlob.type.includes("audio")) {
        audioUrl = URL.createObjectURL(audioBlob);
        audioUrlsRef.current.push(audioUrl);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          text: replyText || "...",
          tools: toolsUsed,
          timestamp: new Date(),
          audioUrl,
        },
      ]);

      // Play audio
      if (audioUrl && audioRef.current) {
        setCallState("speaking");
        audioRef.current.src = audioUrl;
        audioRef.current.onended = () => {
          setCallState("idle");
        };
        audioRef.current.onerror = () => {
          setCallState("idle");
        };
        await audioRef.current.play();
      } else {
        setCallState("idle");
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          text: "Could not reach the voice agent. It may be waking up (~30s). Try again!",
          timestamp: new Date(),
        },
      ]);
      setCallState("idle");
    }
  };

  // Keep ref in sync so startListening callback can call sendToAgent
  sendToAgentRef.current = sendToAgent;

  const handleMicClick = () => {
    if (callState === "listening") {
      // Stop listening manually
      recognitionRef.current?.stop();
    } else if (callState === "idle") {
      startListening();
    }
    // Ignore clicks during processing/speaking
  };

  const startCall = () => {
    setIsCallActive(true);
    setMessages([]);
    setError(null);
    // Small delay then start listening
    setTimeout(() => startListening(), 300);
  };

  const endCall = async () => {
    setIsCallActive(false);
    setCallState("idle");
    recognitionRef.current?.abort();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    try {
      await fetch(`${VOICE_API_URL}/api/v1/voice-demo/session/${sessionId}`, {
        method: "DELETE",
      });
    } catch {}
  };

  const stateLabel: Record<CallState, string> = {
    idle: "Tap mic to speak",
    listening: "Listening...",
    processing: "Thinking...",
    speaking: "Agent speaking...",
  };

  const stateColor: Record<CallState, string> = {
    idle: "bg-muted",
    listening: "bg-red-500",
    processing: "bg-amber-500",
    speaking: "bg-green-500",
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Hidden audio element */}
      <audio ref={audioRef} className="hidden" />

      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/voice-agent"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Voice Agent
            </Link>
            <span className="text-muted-foreground">/</span>
            <h2 className="text-lg font-bold">Voice Call Demo</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Talk to the AI sales agent with your voice — powered by ElevenLabs
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/voice-agent/chat">
            <Button variant="outline" size="sm">
              Text Chat
            </Button>
          </Link>
        </div>
      </div>

      {/* Main area */}
      <Card className="flex-1 flex flex-col min-h-0">
        {/* Conversation transcript */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {!isCallActive && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 text-muted-foreground">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="36"
                    height="36"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
              </div>
              <div>
                <p className="font-medium text-foreground text-lg">
                  Sharma Computers — Voice Demo
                </p>
                <p className="text-sm mt-1">
                  Experience the AI sales agent as if you&apos;re calling the shop
                </p>
                <p className="text-xs mt-2 text-muted-foreground/70">
                  Uses your microphone for speech and ElevenLabs for agent voice
                </p>
              </div>
              <Button
                size="lg"
                className="mt-4 px-8 rounded-full"
                onClick={startCall}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                Start Call
              </Button>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted rounded-bl-md"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                {msg.tools && msg.tools.length > 0 && (
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {msg.tools.map((t) => (
                      <Badge
                        key={t}
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0"
                      >
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
                <p
                  className={`text-[10px] mt-1 ${
                    msg.role === "user"
                      ? "text-primary-foreground/60"
                      : "text-muted-foreground"
                  }`}
                >
                  {msg.timestamp.toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}

          {/* Live transcript while listening */}
          {transcript && (
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl px-4 py-2.5 bg-primary/50 text-primary-foreground rounded-br-md">
                <p className="text-sm italic">{transcript}</p>
              </div>
            </div>
          )}

          {/* Processing indicator */}
          {callState === "processing" && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Call Controls */}
        {isCallActive && (
          <div className="border-t p-4">
            {error && (
              <p className="text-xs text-destructive text-center mb-3">{error}</p>
            )}

            {/* State indicator */}
            <div className="flex items-center justify-center gap-2 mb-3">
              <span
                className={`w-2.5 h-2.5 rounded-full ${stateColor[callState]} ${
                  callState === "listening" ? "animate-pulse" : ""
                }`}
              />
              <span className="text-sm text-muted-foreground">
                {stateLabel[callState]}
              </span>
            </div>

            {/* Mic and End Call buttons */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleMicClick}
                disabled={callState === "processing" || callState === "speaking"}
                className={`relative flex h-16 w-16 items-center justify-center rounded-full transition-all ${
                  callState === "listening"
                    ? "bg-red-500 text-white scale-110"
                    : callState === "processing" || callState === "speaking"
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105"
                }`}
              >
                {/* Pulse ring when listening */}
                {callState === "listening" && (
                  <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
                )}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
              </button>

              <button
                onClick={endCall}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all hover:scale-105"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
                  <line x1="2" x2="22" y1="2" y2="22" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
