"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Product, Category } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import Link from "next/link";
import { Upload, FileText, CheckCircle2 } from "lucide-react";

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadProducts = useCallback(async () => {
    const supabase = createClient();
    let query = supabase
      .from("products")
      .select("*, category:categories(name)")
      .order("updated_at", { ascending: false });

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    const { data } = await query.limit(100);
    setProducts((data as Product[]) || []);
    setLoading(false);
  }, [search]);

  const loadCategories = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("name");
    setCategories((data as Category[]) || []);
  }, []);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [loadProducts, loadCategories]);

  // Real-time subscription for product updates
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("products-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => {
          loadProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadProducts]);

  async function handleSaveProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const supabase = createClient();

    const productData = {
      name: form.get("name") as string,
      brand: form.get("brand") as string,
      sku: form.get("sku") as string,
      description: form.get("description") as string,
      category_id: (form.get("category_id") as string) || null,
      cost_price: parseFloat(form.get("cost_price") as string) || 0,
      selling_price: parseFloat(form.get("selling_price") as string) || 0,
      mrp: parseFloat(form.get("mrp") as string) || 0,
      stock_quantity: parseInt(form.get("stock_quantity") as string) || 0,
      warranty_months: parseInt(form.get("warranty_months") as string) || 12,
      is_active: true,
    };

    if (editingProduct) {
      const { error } = await supabase
        .from("products")
        .update(productData)
        .eq("id", editingProduct.id);
      if (error) {
        toast.error("Failed to update product");
        return;
      }
      toast.success("Product updated");
    } else {
      const { error } = await supabase.from("products").insert(productData);
      if (error) {
        toast.error("Failed to add product");
        return;
      }
      toast.success("Product added");
    }

    setDialogOpen(false);
    setEditingProduct(null);
    loadProducts();
  }

  async function handleDeleteProduct(id: string) {
    const supabase = createClient();
    await supabase.from("products").update({ is_active: false }).eq("id", id);
    toast.success("Product deactivated");
    loadProducts();
  }

  function openEditDialog(product: Product) {
    setEditingProduct(product);
    setDialogOpen(true);
  }

  function openAddDialog() {
    setEditingProduct(null);
    setDialogOpen(true);
  }

  async function handleCsvImport() {
    if (!importFile) {
      toast.error("Please select a CSV file first");
      return;
    }
    setImporting(true);
    try {
      const text = await importFile.text();
      const lines = text.trim().split("\n");
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));

      const requiredHeaders = ["name", "brand", "selling_price", "stock_quantity"];
      const missing = requiredHeaders.filter((h) => !headers.includes(h));
      if (missing.length > 0) {
        toast.error(`CSV missing required columns: ${missing.join(", ")}`);
        setImporting(false);
        return;
      }

      const supabase = createClient();
      let successCount = 0;
      let errorCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""));
        if (values.length < 2) continue;

        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] || "";
        });

        const productData = {
          name: row["name"],
          brand: row["brand"] || "Unknown",
          sku: row["sku"] || null,
          description: row["description"] || null,
          selling_price: parseFloat(row["selling_price"]) || 0,
          cost_price: parseFloat(row["cost_price"]) || 0,
          mrp: parseFloat(row["mrp"]) || parseFloat(row["selling_price"]) || 0,
          stock_quantity: parseInt(row["stock_quantity"]) || 0,
          warranty_months: parseInt(row["warranty_months"]) || 12,
          is_active: true,
        };

        if (!productData.name) continue;

        const { error } = await supabase.from("products").insert(productData);
        if (error) errorCount++;
        else successCount++;
      }

      if (successCount > 0) toast.success(`Imported ${successCount} products successfully`);
      if (errorCount > 0) toast.error(`${errorCount} products failed to import`);

      setImportOpen(false);
      setImportFile(null);
      loadProducts();
    } catch {
      toast.error("Failed to parse CSV file");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Inventory</h2>
          <p className="text-muted-foreground">
            Manage your hardware products and stock levels
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* CSV Import Dialog */}
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger render={<Button variant="outline" />}>
              <Upload className="size-4 mr-2" />
              Import CSV
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Bulk Import Products</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-6 text-center">
                  <FileText className="size-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium mb-1">Upload a CSV file</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Required columns:{" "}
                    <code className="bg-muted px-1 rounded">
                      name, brand, selling_price, stock_quantity
                    </code>
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choose File
                  </Button>
                  {importFile && (
                    <p className="mt-3 text-sm flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle2 className="size-4" />
                      {importFile.name}
                    </p>
                  )}
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Optional columns:</p>
                  <p>sku, description, cost_price, mrp, warranty_months</p>
                </div>
                <Button
                  className="w-full"
                  onClick={handleCsvImport}
                  disabled={!importFile || importing}
                >
                  {importing ? "Importing..." : "Import Products"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Add Product Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={<Button />} onClick={openAddDialog}>
              + Add Product
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? "Edit Product" : "Add New Product"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSaveProduct} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Product Name</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={editingProduct?.name}
                      placeholder="RTX 4070 Ti Super"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brand">Brand</Label>
                    <Input
                      id="brand"
                      name="brand"
                      defaultValue={editingProduct?.brand}
                      placeholder="NVIDIA"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU</Label>
                    <Input
                      id="sku"
                      name="sku"
                      defaultValue={editingProduct?.sku ?? ""}
                      placeholder="NV-4070TIS-16G"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category_id">Category</Label>
                    <Select
                      name="category_id"
                      defaultValue={editingProduct?.category_id ?? ""}
                    >
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
                  <Textarea
                    id="description"
                    name="description"
                    defaultValue={editingProduct?.description ?? ""}
                    placeholder="Product details..."
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cost_price">Cost Price (₹)</Label>
                    <Input
                      id="cost_price"
                      name="cost_price"
                      type="number"
                      defaultValue={editingProduct?.cost_price}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="selling_price">Selling Price (₹)</Label>
                    <Input
                      id="selling_price"
                      name="selling_price"
                      type="number"
                      defaultValue={editingProduct?.selling_price}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mrp">MRP (₹)</Label>
                    <Input
                      id="mrp"
                      name="mrp"
                      type="number"
                      defaultValue={editingProduct?.mrp}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stock_quantity">Stock Quantity</Label>
                    <Input
                      id="stock_quantity"
                      name="stock_quantity"
                      type="number"
                      defaultValue={editingProduct?.stock_quantity}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="warranty_months">Warranty (months)</Label>
                    <Input
                      id="warranty_months"
                      name="warranty_months"
                      type="number"
                      defaultValue={editingProduct?.warranty_months ?? 12}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  {editingProduct ? "Update Product" : "Add Product"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">Product</TableHead>
              <TableHead className="min-w-[90px] hidden sm:table-cell">Brand</TableHead>
              <TableHead className="min-w-[110px] hidden md:table-cell">Category</TableHead>
              <TableHead className="text-right min-w-[90px]">Price (₹)</TableHead>
              <TableHead className="text-right min-w-[60px]">Stock</TableHead>
              <TableHead className="min-w-[85px]">Status</TableHead>
              <TableHead className="text-right min-w-[140px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-muted-foreground"
                >
                  No products found. Add your first product to get started.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {product.name}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{product.brand}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {(product.category as unknown as { name: string })?.name || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    ₹{Number(product.selling_price).toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="text-right">{product.stock_quantity}</TableCell>
                  <TableCell>
                    {product.stock_quantity === 0 ? (
                      <Badge variant="destructive">Out of Stock</Badge>
                    ) : product.stock_quantity < 5 ? (
                      <Badge variant="secondary">Low Stock</Badge>
                    ) : (
                      <Badge variant="default">In Stock</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        render={<Link href={`/inventory/${product.id}`} />}
                      >
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(product)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hidden sm:inline-flex"
                        onClick={() => handleDeleteProduct(product.id)}
                      >
                        Delete
                      </Button>
                    </div>
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
