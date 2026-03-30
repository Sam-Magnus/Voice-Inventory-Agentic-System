"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Offer } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const typeColors: Record<string, string> = {
  percentage: "bg-blue-100 text-blue-700",
  flat: "bg-purple-100 text-purple-700",
  bundle: "bg-amber-100 text-amber-700",
};

const typeLabels: Record<string, string> = {
  percentage: "Discount",
  flat: "Flat Off",
  bundle: "Bundle",
};

function getOfferStatus(offer: Offer): { label: string; color: string } {
  if (!offer.is_active) return { label: "Inactive", color: "bg-gray-100 text-gray-600" };
  const now = new Date();
  const end = offer.end_date ? new Date(offer.end_date) : null;
  if (end && end < now) return { label: "Expired", color: "bg-red-100 text-red-600" };
  return { label: "Active", color: "bg-green-100 text-green-700" };
}

// Simulated redemption data (in production, this comes from orders linked to offers)
function getRedemptionData(offer: Offer) {
  // Generate consistent pseudo-random redemptions based on offer ID
  const hash = offer.id.charCodeAt(0) + offer.id.charCodeAt(1);
  const limit = 50 + (hash % 100);
  const used = Math.floor((hash % 40) + (offer.is_active ? 5 : 20));
  return { used, limit, percentage: Math.round((used / limit) * 100) };
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadOffers = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("offers")
      .select("*")
      .order("is_active", { ascending: false })
      .order("created_at", { ascending: false });
    setOffers((data as Offer[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  async function handleAddOffer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const supabase = createClient();

    const { error } = await supabase.from("offers").insert({
      title: form.get("title") as string,
      description: form.get("description") as string,
      discount_type: form.get("discount_type") as string,
      discount_value: parseFloat(form.get("discount_value") as string) || 0,
      start_date: (form.get("start_date") as string) || new Date().toISOString(),
      end_date: (form.get("end_date") as string) || null,
      is_active: true,
    });

    if (error) {
      toast.error("Failed to create offer");
      return;
    }

    toast.success("Offer created");
    setDialogOpen(false);
    loadOffers();
  }

  async function toggleOffer(id: string, currentActive: boolean) {
    const supabase = createClient();
    await supabase
      .from("offers")
      .update({ is_active: !currentActive })
      .eq("id", id);
    loadOffers();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Offers</h2>
          <p className="text-muted-foreground">
            {offers.length} promotional offer{offers.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>+ Create Offer</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Offer</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddOffer} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Offer Title</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="Summer Sale on GPUs"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Details about the offer..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discount_type">Discount Type</Label>
                  <Select name="discount_type" defaultValue="percentage">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="flat">Flat Amount</SelectItem>
                      <SelectItem value="bundle">Bundle Deal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount_value">Discount Value</Label>
                  <Input
                    id="discount_value"
                    name="discount_value"
                    type="number"
                    placeholder="10"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input id="start_date" name="start_date" type="date" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input id="end_date" name="end_date" type="date" />
                </div>
              </div>
              <Button type="submit" className="w-full">
                Create Offer
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading offers...</p>
      ) : offers.length === 0 ? (
        <p className="text-muted-foreground">No offers created yet.</p>
      ) : (
        <div className="space-y-3">
          {offers.map((offer) => {
            const status = getOfferStatus(offer);
            const redemption = getRedemptionData(offer);
            const barColor =
              status.label === "Active"
                ? "bg-green-500"
                : status.label === "Expired"
                ? "bg-red-400"
                : "bg-gray-400";

            return (
              <div
                key={offer.id}
                className="flex items-center justify-between rounded-lg border bg-card p-4 hover:bg-muted/30 transition-colors"
              >
                {/* Left: Offer details */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-base">
                      {offer.title}
                      {offer.discount_type === "percentage"
                        ? ` — ${offer.discount_value}% Off`
                        : ` — ₹${Number(offer.discount_value).toLocaleString("en-IN")} Off`}
                    </h3>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        typeColors[offer.discount_type] || "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {typeLabels[offer.discount_type] || offer.discount_type}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {offer.description || "No description"}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      Discount:{" "}
                      <strong className="text-foreground">
                        {offer.discount_type === "percentage"
                          ? `${offer.discount_value}% OFF`
                          : `₹${Number(offer.discount_value).toLocaleString("en-IN")} OFF`}
                      </strong>
                    </span>
                    {offer.start_date && offer.end_date && (
                      <span>
                        Valid: {formatDate(offer.start_date)} —{" "}
                        {formatDate(offer.end_date)}
                      </span>
                    )}
                    <button
                      onClick={() => toggleOffer(offer.id, offer.is_active)}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {offer.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>

                {/* Right: Redemption stats */}
                <div className="hidden sm:flex flex-col items-end ml-6 min-w-[120px]">
                  <div className="text-right">
                    <span className="text-xl font-bold">{redemption.used}</span>
                    <span className="text-sm text-muted-foreground">
                      {" "}
                      / {redemption.limit}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground mb-1">
                    Redemptions
                  </span>
                  <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor}`}
                      style={{ width: `${Math.min(redemption.percentage, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground mt-0.5">
                    {redemption.percentage}% used
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
