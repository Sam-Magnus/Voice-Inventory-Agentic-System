"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

interface Stats {
  totalProducts: number;
  totalStock: number;
  lowStockCount: number;
  outOfStockCount: number;
  inventoryValue: number;
  totalCustomers: number;
  whatsappOptedIn: number;
  totalOrders: number;
  revenue: number;
  avgOrderValue: number;
  quotedOrders: number;
  confirmedOrders: number;
  paidOrders: number;
  deliveredOrders: number;
  voiceAgentOrders: number;
  walkInOrders: number;
  whatsappOrders: number;
  totalCalls: number;
  salesCalls: number;
  handoffCalls: number;
  activeOffers: number;
  categoryBreakdown: Array<{ name: string; count: number; value: number }>;
}

// Dummy 7-day revenue trend data
function generateRevenueTrend() {
  const days = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push({
      date: d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" }),
      revenue: Math.floor(Math.random() * 80000) + 20000,
    });
  }
  return days;
}

const CHANNEL_COLORS = ["#6366f1", "#10b981", "#f59e0b"];
const CAT_COLORS = [
  "#6366f1", "#10b981", "#a855f7", "#f59e0b", "#06b6d4",
  "#ec4899", "#3b82f6", "#f97316", "#14b8a6", "#f43f5e",
];

const funnelColors = [
  "bg-indigo-500",
  "bg-cyan-500",
  "bg-green-500",
  "bg-emerald-500",
];

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [revenueTrend] = useState(generateRevenueTrend);

  useEffect(() => {
    async function loadStats() {
      const supabase = createClient();

      const [
        productsRes,
        customersRes,
        ordersRes,
        callsRes,
        offersRes,
        categoriesRes,
      ] = await Promise.all([
        supabase.from("products").select("*").eq("is_active", true),
        supabase.from("customers").select("id, whatsapp_opted_in"),
        supabase.from("orders").select("*"),
        supabase.from("call_logs").select("id, outcome"),
        supabase
          .from("offers")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true),
        supabase.from("products").select("category:categories(name), selling_price, stock_quantity").eq("is_active", true),
      ]);

      const products = productsRes.data || [];
      const customers = customersRes.data || [];
      const orders = ordersRes.data || [];
      const calls = callsRes.data || [];
      const catProducts = categoriesRes.data || [];

      const totalStock = products.reduce((s, p) => s + (p.stock_quantity || 0), 0);
      const lowStock = products.filter((p) => p.stock_quantity > 0 && p.stock_quantity < 5).length;
      const outOfStock = products.filter((p) => p.stock_quantity === 0).length;
      const inventoryValue = products.reduce(
        (s, p) => s + (p.selling_price || 0) * (p.stock_quantity || 0),
        0
      );

      const whatsappOptedIn = customers.filter((c) => c.whatsapp_opted_in).length;

      const revenue = orders.reduce((s, o) => s + (Number(o.total_amount) || 0), 0);
      const avgOrderValue = orders.length > 0 ? revenue / orders.length : 0;
      const quotedOrders = orders.filter((o) => o.status === "quoted").length;
      const confirmedOrders = orders.filter((o) => o.status === "confirmed").length;
      const paidOrders = orders.filter((o) => o.status === "paid").length;
      const deliveredOrders = orders.filter((o) => o.status === "delivered").length;
      const voiceAgentOrders = orders.filter((o) => o.source === "voice-agent").length;
      const walkInOrders = orders.filter((o) => o.source === "walk-in").length;
      const whatsappOrders = orders.filter((o) => o.source === "whatsapp").length;

      const salesCalls = calls.filter((c) => c.outcome === "sale").length;
      const handoffCalls = calls.filter((c) => c.outcome === "handoff").length;

      const catMap = new Map<string, { count: number; value: number }>();
      for (const p of catProducts) {
        const catName = (p.category as unknown as { name: string })?.name || "Uncategorized";
        const existing = catMap.get(catName) || { count: 0, value: 0 };
        existing.count += 1;
        existing.value += (p.selling_price || 0) * (p.stock_quantity || 0);
        catMap.set(catName, existing);
      }
      const categoryBreakdown = Array.from(catMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.value - a.value);

      setStats({
        totalProducts: products.length,
        totalStock,
        lowStockCount: lowStock,
        outOfStockCount: outOfStock,
        inventoryValue,
        totalCustomers: customers.length,
        whatsappOptedIn,
        totalOrders: orders.length,
        revenue,
        avgOrderValue,
        quotedOrders,
        confirmedOrders,
        paidOrders,
        deliveredOrders,
        voiceAgentOrders,
        walkInOrders,
        whatsappOrders,
        totalCalls: calls.length,
        salesCalls,
        handoffCalls,
        activeOffers: offersRes.count || 0,
        categoryBreakdown,
      });
      setLoading(false);
    }

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  if (!stats) return null;

  const funnelData = [
    { label: "Quoted", value: stats.quotedOrders },
    { label: "Confirmed", value: stats.confirmedOrders },
    { label: "Paid", value: stats.paidOrders },
    { label: "Delivered", value: stats.deliveredOrders },
  ];
  const maxFunnel = Math.max(...funnelData.map((f) => f.value), 1);

  // Pie chart data for channels
  const channelPieData = [
    { name: "Walk-in", value: stats.walkInOrders || 1 },
    { name: "Voice Agent", value: stats.voiceAgentOrders || 1 },
    { name: "WhatsApp", value: stats.whatsappOrders || 1 },
  ];

  // Bar chart for top categories (by product count)
  const topCategories = stats.categoryBreakdown.slice(0, 6).map((c) => ({
    name: c.name.length > 12 ? c.name.slice(0, 12) + "…" : c.name,
    count: c.count,
    value: Math.round(c.value / 1000),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
          <p className="text-muted-foreground">
            Overview of your shop&apos;s performance
          </p>
        </div>
        <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
          Last updated: just now
        </span>
      </div>

      {/* Stat Cards Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Products" value={stats.totalProducts} sub="active" />
        <StatCard label="In Stock" value={stats.totalStock} sub="total units" />
        <StatCard
          label="Low Stock"
          value={stats.lowStockCount}
          color={stats.lowStockCount > 0 ? "text-yellow-600" : undefined}
        />
        <StatCard
          label="Out of Stock"
          value={stats.outOfStockCount}
          color={stats.outOfStockCount > 0 ? "text-red-600" : undefined}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={`₹${stats.revenue.toLocaleString("en-IN")}`} />
        <StatCard label="Total Orders" value={stats.totalOrders} />
        <StatCard
          label="Avg Order Value"
          value={`₹${Math.round(stats.avgOrderValue).toLocaleString("en-IN")}`}
        />
        <StatCard
          label="Inventory Value"
          value={`₹${(stats.inventoryValue / 1000).toFixed(0)}K`}
          sub={`₹${stats.inventoryValue.toLocaleString("en-IN")}`}
        />
      </div>

      {/* Revenue Trend Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue Trend (Last 7 Days)</CardTitle>
          <CardDescription>Daily revenue across all channels — sample data</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={revenueTrend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`}
              />
              <Tooltip
                formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`, "Revenue"]}
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "hsl(var(--primary))" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Pie + Bar Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Pie Chart: Sales by Channel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sales by Channel</CardTitle>
            <CardDescription>Order distribution across channels</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row items-center gap-4">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie
                  data={channelPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {channelPieData.map((entry, index) => (
                    <Cell key={entry.name} fill={CHANNEL_COLORS[index % CHANNEL_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-1">
              {channelPieData.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: CHANNEL_COLORS[i] }}
                    />
                    <span className="text-sm text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="text-sm font-semibold">{item.value === 1 && stats.totalOrders === 0 ? 0 : item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bar Chart: Top Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Selling Categories</CardTitle>
            <CardDescription>Product count by category</CardDescription>
          </CardHeader>
          <CardContent>
            {topCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No category data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={topCategories} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value) => [value, "Products"]}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {topCategories.map((entry, index) => (
                      <Cell key={entry.name} fill={CAT_COLORS[index % CAT_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Funnel + Voice Agent */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Order Funnel</CardTitle>
            <CardDescription>Status distribution of all orders</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {funnelData.map((item, i) => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="text-sm w-20 text-right text-muted-foreground">
                  {item.label}
                </span>
                <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${funnelColors[i]} transition-all`}
                    style={{
                      width: `${Math.max((item.value / maxFunnel) * 100, item.value > 0 ? 8 : 0)}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-semibold w-8 text-right">
                  {item.value}
                </span>
              </div>
            ))}
            {stats.totalOrders === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">No orders yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Voice Agent Performance</CardTitle>
            <CardDescription>Call handling metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <StatItem label="Total Calls" value={stats.totalCalls} />
              <StatItem label="Sales Closed" value={stats.salesCalls} color="text-green-600" />
              <StatItem label="Handoffs" value={stats.handoffCalls} />
              <StatItem
                label="Conversion Rate"
                value={
                  stats.totalCalls > 0
                    ? `${Math.round((stats.salesCalls / stats.totalCalls) * 100)}%`
                    : "—"
                }
                color="text-indigo-600"
              />
            </div>
            <Separator className="my-4" />
            <div className="grid grid-cols-2 gap-4">
              <StatItem label="Customers" value={stats.totalCustomers} />
              <StatItem label="WhatsApp Opted In" value={stats.whatsappOptedIn} color="text-green-600" />
              <StatItem label="Active Offers" value={stats.activeOffers} />
              <StatItem label="Voice Orders" value={stats.voiceAgentOrders} color="text-indigo-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Value by Category */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Inventory Value by Category</CardTitle>
          <CardDescription>Stock value distribution across product categories</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.categoryBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No categories yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(stats.categoryBreakdown.length * 40, 120)}>
              <BarChart
                data={stats.categoryBreakdown.slice(0, 8).map((c) => ({
                  name: c.name.length > 14 ? c.name.slice(0, 14) + "…" : c.name,
                  value: Math.round(c.value / 1000),
                  rawValue: c.value,
                }))}
                layout="vertical"
                margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${v}K`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value, _name, props) => {
                    const payload = props?.payload as { rawValue?: number } | undefined;
                    const raw = payload?.rawValue ?? Number(value) * 1000;
                    return [`₹${raw.toLocaleString("en-IN")}`, "Stock Value"];
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {stats.categoryBreakdown.slice(0, 8).map((entry, index) => (
                    <Cell key={entry.name} fill={CAT_COLORS[index % CAT_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-5 pb-5">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${color || ""}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function StatItem({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold mt-0.5 ${color || ""}`}>{value}</p>
    </div>
  );
}
