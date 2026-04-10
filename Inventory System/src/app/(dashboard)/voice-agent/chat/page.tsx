"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `web-${Date.now()}`);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, [loading]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [
      ...prev,
      { role: "user", text: userMsg, timestamp: new Date() },
    ]);
    setLoading(true);

    try {
      const res = await fetch(`${VOICE_API_URL}/api/v1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          session_id: sessionId,
        }),
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          text: data.reply,
          tools: data.tools_used,
          timestamp: new Date(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          text: "Sorry, could not reach the voice agent API. It may be sleeping (free tier wakes up in ~30s). Try again!",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function resetChat() {
    try {
      await fetch(`${VOICE_API_URL}/api/v1/chat/${sessionId}`, {
        method: "DELETE",
      });
    } catch {}
    setMessages([]);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
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
            <h2 className="text-lg font-bold">Live Chat</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Chat with the AI sales agent as if you&apos;re calling Sharma
            Computers
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/voice-agent/call">
            <Button variant="outline" size="sm">
              Voice Call
            </Button>
          </a>
          <Button variant="outline" size="sm" onClick={resetChat}>
            Reset Chat
          </Button>
        </div>
      </div>

      {/* Chat Messages */}
      <Card className="flex-1 flex flex-col min-h-0">
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          {/* Welcome message */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-3 text-muted-foreground">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary text-xl">
                SF
              </div>
              <div>
                <p className="font-medium text-foreground">
                  Sharma Computers — AI Sales Agent
                </p>
                <p className="text-sm">
                  Try asking about products, prices, PC builds, or stock
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center pt-2">
                {[
                  "RTX 4070 ka price kya hai?",
                  "32GB DDR5 RAM hai?",
                  "Gaming PC build, budget 80K",
                  "Samsung SSD stock mein hai?",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setInput(q);
                      inputRef.current?.focus();
                    }}
                    className="text-xs px-3 py-1.5 rounded-full border hover:bg-muted transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
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

          {/* Loading indicator */}
          {loading && (
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

        {/* Input */}
        <form
          onSubmit={sendMessage}
          className="border-t p-3 flex gap-2"
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message... (e.g. RTX 4070 available hai?)"
            disabled={loading}
            className="flex-1"
          />
          <Button type="submit" disabled={loading || !input.trim()}>
            Send
          </Button>
        </form>
      </Card>
    </div>
  );
}
