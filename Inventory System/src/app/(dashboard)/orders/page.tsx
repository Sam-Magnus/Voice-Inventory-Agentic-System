"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Order } from "@/types/database";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusColors: Record<string, "default" | "secondary" | "destructive"> = {
  quoted: "secondary",
  confirmed: "default",
  paid: "default",
  shipped: "default",
  delivered: "default",
  cancelled: "destructive",
  returned: "destructive",
};

const sourceLabels: Record<string, string> = {
  "walk-in": "Walk-in",
  "voice-agent": "Voice Agent",
  whatsapp: "WhatsApp",
  website: "Website",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    const supabase = createClient();
    let query = supabase
      .from("orders")
      .select("*, customer:customers(name, phone)")
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data } = await query.limit(100);
    setOrders((data as Order[]) || []);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Real-time subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => loadOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadOrders]);

  async function updateStatus(orderId: string, newStatus: string) {
    const supabase = createClient();
    await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    loadOrders();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Orders</h2>
        <p className="text-muted-foreground">
          Track orders and quotes from all channels
        </p>
      </div>

      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={(val) => val && setStatusFilter(val)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="quoted">Quoted</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[130px]">Order #</TableHead>
              <TableHead className="min-w-[60px] hidden sm:table-cell">View</TableHead>
              <TableHead className="min-w-[100px]">Customer</TableHead>
              <TableHead className="min-w-[90px] hidden md:table-cell">Source</TableHead>
              <TableHead className="text-right min-w-[90px]">Amount (₹)</TableHead>
              <TableHead className="min-w-[85px]">Status</TableHead>
              <TableHead className="min-w-[85px] hidden sm:table-cell">Date</TableHead>
              <TableHead className="min-w-[140px]">Update Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No orders found.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-sm">
                    {order.order_number}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Link
                      href={`/orders/${order.id}`}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Details
                    </Link>
                  </TableCell>
                  <TableCell>
                    {(order.customer as unknown as { name: string })?.name || "-"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="secondary">
                      {sourceLabels[order.source] || order.source}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ₹{Number(order.total_amount).toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColors[order.status] || "secondary"}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {new Date(order.created_at).toLocaleDateString("en-IN")}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={order.status}
                      onValueChange={(val) => val && updateStatus(order.id, val)}
                    >
                      <SelectTrigger className="h-8 w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="quoted">Quoted</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
