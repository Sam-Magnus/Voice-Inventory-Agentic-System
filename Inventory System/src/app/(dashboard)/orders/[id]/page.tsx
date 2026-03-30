"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Order } from "@/types/database";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  Phone,
  ShoppingCart,
  CheckCircle2,
  Circle,
} from "lucide-react";

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

const ALL_STATUSES = ["quoted", "confirmed", "paid", "shipped", "delivered"];

interface OrderItem {
  id: string;
  order_id: string;
  product_id?: string;
  quantity: number;
  unit_price: number;
  discount: number;
  product?: {
    name: string;
    brand: string;
    sku?: string;
  };
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadOrder() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("orders")
      .select("*, customer:customers(name, phone, email)")
      .eq("id", orderId)
      .single();

    if (error || !data) {
      toast.error("Order not found");
      router.push("/orders");
      return;
    }
    setOrder(data as Order);

    // Load order items
    const { data: items } = await supabase
      .from("order_items")
      .select("*, product:products(name, brand, sku)")
      .eq("order_id", orderId);

    setOrderItems((items as OrderItem[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    loadOrder();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  async function handleStatusUpdate(newStatus: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      toast.error("Failed to update status");
      return;
    }
    toast.success(`Order status updated to ${newStatus}`);
    loadOrder();
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!order) return null;

  const customer = order.customer as unknown as { name: string; phone: string; email?: string } | null;

  // Compute timeline — which steps are done
  const activeStatusIndex = ALL_STATUSES.indexOf(order.status);
  const isTerminal = order.status === "cancelled" || order.status === "returned";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="sm" render={<Link href="/orders" />} className="mt-0.5">
            <ArrowLeft className="size-4 mr-1" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight font-mono">
              {order.order_number}
            </h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              Created on {new Date(order.created_at).toLocaleDateString("en-IN", { dateStyle: "long" })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={statusColors[order.status] || "secondary"} className="text-sm px-3 py-1">
            {order.status}
          </Badge>
          <Select value={order.status} onValueChange={(val) => val && handleStatusUpdate(val)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="quoted">Quoted</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="returned">Returned</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Status timeline */}
      {!isTerminal && (
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between gap-2 overflow-x-auto">
              {ALL_STATUSES.map((status, idx) => {
                const isDone = activeStatusIndex >= idx;
                const isCurrent = activeStatusIndex === idx;
                return (
                  <div key={status} className="flex items-center gap-2 shrink-0">
                    <div className="flex flex-col items-center gap-1">
                      {isDone ? (
                        <CheckCircle2
                          className={`size-5 ${isCurrent ? "text-primary" : "text-green-500"}`}
                        />
                      ) : (
                        <Circle className="size-5 text-muted-foreground/40" />
                      )}
                      <span className={`text-xs capitalize ${isCurrent ? "font-semibold text-primary" : isDone ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
                        {status}
                      </span>
                    </div>
                    {idx < ALL_STATUSES.length - 1 && (
                      <div className={`h-0.5 w-10 md:w-16 rounded-full mb-4 ${idx < activeStatusIndex ? "bg-green-400" : "bg-muted"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {isTerminal && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive font-medium">
          This order was {order.status}.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {/* Order items */}
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingCart className="size-4 text-primary" />
                Line Items
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px] pl-4">Product</TableHead>
                      <TableHead className="min-w-[60px] hidden md:table-cell">SKU</TableHead>
                      <TableHead className="text-right min-w-[60px]">Qty</TableHead>
                      <TableHead className="text-right min-w-[80px]">Unit Price</TableHead>
                      <TableHead className="text-right min-w-[70px] hidden sm:table-cell">Discount</TableHead>
                      <TableHead className="text-right min-w-[80px] pr-4">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8 pl-4">
                          No items found for this order.
                        </TableCell>
                      </TableRow>
                    ) : (
                      orderItems.map((item) => {
                        const subtotal = item.unit_price * item.quantity - (item.discount || 0);
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="pl-4">
                              <p className="font-medium">{item.product?.name || "—"}</p>
                              <p className="text-xs text-muted-foreground">{item.product?.brand}</p>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                              {item.product?.sku || "—"}
                            </TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">
                              ₹{Number(item.unit_price).toLocaleString("en-IN")}
                            </TableCell>
                            <TableCell className="text-right hidden sm:table-cell text-muted-foreground">
                              {item.discount ? `−₹${Number(item.discount).toLocaleString("en-IN")}` : "—"}
                            </TableCell>
                            <TableCell className="text-right font-medium pr-4">
                              ₹{subtotal.toLocaleString("en-IN")}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar: customer + order summary */}
        <div className="space-y-4">
          {customer && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="size-4 text-primary" />
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium">{customer.name}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Phone className="size-3" />
                  {customer.phone}
                </p>
                {customer.email && (
                  <p className="text-sm text-muted-foreground">{customer.email}</p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <SummaryRow label="Source" value={<Badge variant="secondary" className="text-xs">{sourceLabels[order.source] || order.source}</Badge>} />
              <SummaryRow label="Payment" value={order.payment_method || "—"} />
              <Separator />
              <SummaryRow
                label="Discount"
                value={order.discount_amount ? `−₹${Number(order.discount_amount).toLocaleString("en-IN")}` : "₹0"}
              />
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold">
                  ₹{Number(order.total_amount).toLocaleString("en-IN")}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
