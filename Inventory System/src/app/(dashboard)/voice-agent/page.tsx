"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { CallLog } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const outcomeColors: Record<string, "default" | "secondary" | "destructive"> = {
  sale: "default",
  quote_sent: "default",
  info: "secondary",
  handoff: "secondary",
  missed: "destructive",
  abandoned: "destructive",
};

export default function VoiceAgentPage() {
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);
  const [stats, setStats] = useState({ total: 0, sales: 0, avgDuration: 0 });

  const loadCalls = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("call_logs")
      .select("*, customer:customers(name)")
      .order("started_at", { ascending: false })
      .limit(50);

    const callData = (data as CallLog[]) || [];
    setCalls(callData);

    // Compute stats
    const total = callData.length;
    const sales = callData.filter((c) => c.outcome === "sale").length;
    const avgDuration =
      total > 0
        ? callData.reduce((sum, c) => sum + (c.duration_secs || 0), 0) / total
        : 0;

    setStats({ total, sales, avgDuration: Math.round(avgDuration) });
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCalls();
  }, [loadCalls]);

  // Real-time updates
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("calls-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "call_logs" },
        () => loadCalls()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadCalls]);

  function formatDuration(secs: number | undefined) {
    if (!secs) return "-";
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}:${remaining.toString().padStart(2, "0")}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Voice Agent</h2>
          <p className="text-muted-foreground">
            Monitor AI voice agent calls and performance
          </p>
        </div>
        <a
          href="/voice-agent/chat"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Try Live Chat
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Calls</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Conversions (Sales)</CardDescription>
            <CardTitle className="text-3xl">
              {stats.sales}
              {stats.total > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({Math.round((stats.sales / stats.total) * 100)}%)
                </span>
              )}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Duration</CardDescription>
            <CardTitle className="text-3xl">
              {formatDuration(stats.avgDuration)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Caller</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead>Summary</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : calls.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No calls yet. The voice agent will log calls here.
                </TableCell>
              </TableRow>
            ) : (
              calls.map((call) => (
                <TableRow
                  key={call.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedCall(call)}
                >
                  <TableCell className="text-sm">
                    {new Date(call.started_at).toLocaleString("en-IN", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {call.caller_phone}
                  </TableCell>
                  <TableCell>
                    {(call.customer as unknown as { name: string })?.name || "-"}
                  </TableCell>
                  <TableCell>{formatDuration(call.duration_secs)}</TableCell>
                  <TableCell>
                    {call.outcome ? (
                      <Badge variant={outcomeColors[call.outcome] || "secondary"}>
                        {call.outcome}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                    {call.summary || "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Call transcript dialog */}
      <Dialog
        open={!!selectedCall}
        onOpenChange={(open) => !open && setSelectedCall(null)}
      >
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Call Transcript — {selectedCall?.caller_phone}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {selectedCall?.summary && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <strong>Summary:</strong> {selectedCall.summary}
              </div>
            )}
            <div className="space-y-2">
              {selectedCall?.transcript?.map((msg, i) => (
                <div
                  key={i}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    msg.role === "customer" || msg.role === "user"
                      ? "bg-blue-50 dark:bg-blue-950 ml-0 mr-8"
                      : "bg-muted ml-8 mr-0"
                  }`}
                >
                  <span className="text-xs font-medium text-muted-foreground">
                    {msg.role === "customer" || msg.role === "user"
                      ? "Customer"
                      : "Agent"}
                  </span>
                  <p>{msg.text}</p>
                </div>
              ))}
              {(!selectedCall?.transcript ||
                selectedCall.transcript.length === 0) && (
                <p className="text-muted-foreground text-sm">
                  No transcript available.
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
