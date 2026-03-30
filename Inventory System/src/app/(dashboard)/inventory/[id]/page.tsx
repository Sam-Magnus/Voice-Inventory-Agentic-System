"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Product } from "@/types/database";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Edit2, Package, Tag, Layers, ShieldCheck } from "lucide-react";
import { Category } from "@/types/database";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  async function loadProduct() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("products")
      .select("*, category:categories(name, id)")
      .eq("id", productId)
      .single();

    if (error || !data) {
      toast.error("Product not found");
      router.push("/inventory");
      return;
    }
    setProduct(data as Product);
    setLoading(false);
  }

  async function loadCategories() {
    const supabase = createClient();
    const { data } = await supabase.from("categories").select("*").order("name");
    setCategories((data as Category[]) || []);
  }

  useEffect(() => {
    loadProduct();
    loadCategories();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function handleSaveProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const supabase = createClient();

    const productData = {
      name: form.get("name") as string,
      brand: form.get("brand") as string,
      sku: form.get("sku") as string,
      description: form.get("description") as string,
      category_id: form.get("category_id") as string || null,
      cost_price: parseFloat(form.get("cost_price") as string) || 0,
      selling_price: parseFloat(form.get("selling_price") as string) || 0,
      mrp: parseFloat(form.get("mrp") as string) || 0,
      stock_quantity: parseInt(form.get("stock_quantity") as string) || 0,
      warranty_months: parseInt(form.get("warranty_months") as string) || 12,
    };

    const { error } = await supabase
      .from("products")
      .update(productData)
      .eq("id", productId);

    if (error) {
      toast.error("Failed to update product");
      return;
    }
    toast.success("Product updated");
    setEditOpen(false);
    loadProduct();
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!product) return null;

  const margin =
    product.cost_price > 0
      ? (((product.selling_price - product.cost_price) / product.cost_price) * 100).toFixed(1)
      : "—";

  const stockStatus =
    product.stock_quantity === 0
      ? { label: "Out of Stock", variant: "destructive" as const }
      : product.stock_quantity < 5
      ? { label: "Low Stock", variant: "secondary" as const }
      : { label: "In Stock", variant: "default" as const };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="sm" render={<Link href="/inventory" />} className="mt-0.5">
            <ArrowLeft className="size-4 mr-1" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{product.name}</h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              {product.brand} {product.sku ? `· SKU: ${product.sku}` : ""}
            </p>
          </div>
        </div>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger render={<Button variant="outline" />}>
            <Edit2 className="size-4 mr-2" />
            Edit Product
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name</Label>
                  <Input id="name" name="name" defaultValue={product.name} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Input id="brand" name="brand" defaultValue={product.brand} required />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input id="sku" name="sku" defaultValue={product.sku ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category_id">Category</Label>
                  <Select name="category_id" defaultValue={product.category_id ?? ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" defaultValue={product.description ?? ""} rows={2} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cost_price">Cost (₹)</Label>
                  <Input id="cost_price" name="cost_price" type="number" defaultValue={product.cost_price} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="selling_price">Selling (₹)</Label>
                  <Input id="selling_price" name="selling_price" type="number" defaultValue={product.selling_price} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mrp">MRP (₹)</Label>
                  <Input id="mrp" name="mrp" type="number" defaultValue={product.mrp} required />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stock_quantity">Stock Qty</Label>
                  <Input id="stock_quantity" name="stock_quantity" type="number" defaultValue={product.stock_quantity} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warranty_months">Warranty (months)</Label>
                  <Input id="warranty_months" name="warranty_months" type="number" defaultValue={product.warranty_months ?? 12} />
                </div>
              </div>
              <Button type="submit" className="w-full">Save Changes</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Left: core info */}
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="size-4 text-primary" />
                Product Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {product.description && (
                <p className="text-sm text-muted-foreground">{product.description}</p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <InfoItem label="Brand" value={product.brand} />
                <InfoItem label="SKU" value={product.sku || "—"} />
                <InfoItem
                  label="Category"
                  value={(product.category as unknown as { name: string })?.name || "—"}
                />
                <InfoItem label="Warranty" value={product.warranty_months ? `${product.warranty_months} months` : "—"} />
                <InfoItem label="Added" value={new Date(product.created_at).toLocaleDateString("en-IN")} />
                <InfoItem label="Last Updated" value={new Date(product.updated_at).toLocaleDateString("en-IN")} />
              </div>
              {product.tags && product.tags.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <Tag className="size-3" /> Tags
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {product.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Specs */}
          {product.specs && Object.keys(product.specs).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="size-4 text-primary" />
                  Specifications
                </CardTitle>
                <CardDescription>Technical details from product specs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(product.specs).map(([key, val]) => (
                    <div key={key} className="flex justify-between py-1.5 border-b border-border/60 last:border-0">
                      <span className="text-sm text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                      <span className="text-sm font-medium text-right max-w-[60%]">
                        {typeof val === "object" ? JSON.stringify(val) : String(val)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: pricing & stock */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Stock Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">{product.stock_quantity}</span>
                <Badge variant={stockStatus.variant} className="text-sm px-3 py-1">
                  {stockStatus.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Alert threshold: {product.min_stock_alert ?? 5} units
              </p>
              <Separator />
              <div className="space-y-2">
                {product.color_variants && product.color_variants.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Color Variants</p>
                    <div className="flex flex-wrap gap-1.5">
                      {product.color_variants.map((c) => (
                        <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <PriceItem label="Selling Price" value={`₹${Number(product.selling_price).toLocaleString("en-IN")}`} primary />
              <PriceItem label="MRP" value={`₹${Number(product.mrp).toLocaleString("en-IN")}`} />
              <PriceItem label="Cost Price" value={`₹${Number(product.cost_price).toLocaleString("en-IN")}`} />
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Margin</span>
                <span className="text-sm font-semibold text-green-600">{margin}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Stock Value</span>
                <span className="text-sm font-semibold">
                  ₹{(Number(product.selling_price) * product.stock_quantity).toLocaleString("en-IN")}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value}</p>
    </div>
  );
}

function PriceItem({ label, value, primary }: { label: string; value: string; primary?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold ${primary ? "text-lg text-foreground" : ""}`}>{value}</span>
    </div>
  );
}
