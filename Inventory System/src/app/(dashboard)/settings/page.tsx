"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Tenant } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function SettingsPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTenant() {
      const supabase = createClient();
      const { data } = await supabase.from("tenants").select("*").limit(1).single();
      setTenant(data as Tenant);
      setLoading(false);
    }
    loadTenant();
  }, []);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!tenant) return;

    const form = new FormData(e.currentTarget);
    const supabase = createClient();

    const settings = {
      ...tenant.settings,
      greeting: form.get("greeting") as string,
      business_hours: form.get("business_hours") as string,
      upsell_level: form.get("upsell_level") as string,
    };

    const { error } = await supabase
      .from("tenants")
      .update({
        name: form.get("name") as string,
        owner_name: form.get("owner_name") as string,
        owner_phone: form.get("owner_phone") as string,
        address: form.get("address") as string,
        shop_direct_phone: form.get("shop_direct_phone") as string,
        settings,
      })
      .eq("id", tenant.id);

    if (error) {
      toast.error("Failed to save settings");
      return;
    }

    toast.success("Settings saved");
  }

  if (loading) return <p>Loading...</p>;
  if (!tenant) return <p>No shop configured. Contact support.</p>;

  const settings = tenant.settings as Record<string, string>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Configure your shop and voice agent settings
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Shop Information</CardTitle>
            <CardDescription>Basic details about your shop</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Shop Name</Label>
                <Input id="name" name="name" defaultValue={tenant.name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner_name">Owner Name</Label>
                <Input
                  id="owner_name"
                  name="owner_name"
                  defaultValue={tenant.owner_name}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="owner_phone">Owner Phone</Label>
                <Input
                  id="owner_phone"
                  name="owner_phone"
                  defaultValue={tenant.owner_phone}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shop_direct_phone">
                  Shop Direct Phone (for handoffs)
                </Label>
                <Input
                  id="shop_direct_phone"
                  name="shop_direct_phone"
                  defaultValue={tenant.shop_direct_phone ?? ""}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                name="address"
                defaultValue={tenant.address ?? ""}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Voice Agent Configuration</CardTitle>
            <CardDescription>
              Customize how the AI agent handles calls
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="greeting">Greeting Message</Label>
              <Textarea
                id="greeting"
                name="greeting"
                defaultValue={
                  settings?.greeting ||
                  `Hello! Welcome to ${tenant.name}. How can I help you today?`
                }
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                The first thing the AI says when answering a call
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="business_hours">Business Hours</Label>
                <Input
                  id="business_hours"
                  name="business_hours"
                  defaultValue={settings?.business_hours || "10 AM - 8 PM, Mon-Sat"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="upsell_level">Upsell Aggressiveness</Label>
                <Select
                  name="upsell_level"
                  defaultValue={settings?.upsell_level || "medium"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low — Subtle suggestions</SelectItem>
                    <SelectItem value="medium">Medium — Active upselling</SelectItem>
                    <SelectItem value="high">
                      High — Aggressive sales tactics
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle>Integration Status</CardTitle>
            <CardDescription>External service connections</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Twilio (Voice)</span>
              <span className={tenant.twilio_phone ? "text-green-600" : "text-muted-foreground"}>
                {tenant.twilio_phone || "Not configured"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>WhatsApp</span>
              <span className={tenant.whatsapp_phone_id ? "text-green-600" : "text-muted-foreground"}>
                {tenant.whatsapp_phone_id ? "Connected" : "Not configured"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Button type="submit">Save Settings</Button>
      </form>
    </div>
  );
}
