export interface Tenant {
  id: string;
  name: string;
  slug: string;
  owner_name: string;
  owner_phone: string;
  owner_email?: string;
  address?: string;
  whatsapp_phone_id?: string;
  twilio_phone?: string;
  shop_direct_phone?: string;
  settings: Record<string, unknown>;
  subscription_tier: "premium" | "mid" | "budget";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  parent_id?: string;
  sort_order: number;
}

export interface Product {
  id: string;
  tenant_id: string;
  category_id?: string;
  name: string;
  brand: string;
  sku?: string;
  description?: string;
  specs: Record<string, unknown>;
  color_variants: string[];
  cost_price: number;
  selling_price: number;
  mrp: number;
  stock_quantity: number;
  min_stock_alert: number;
  warranty_months: number;
  is_active: boolean;
  tags: string[];
  image_url?: string;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface Customer {
  id: string;
  tenant_id: string;
  name: string;
  phone: string;
  email?: string;
  whatsapp_opted_in: boolean;
  notes: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  tenant_id: string;
  customer_id?: string;
  order_number: string;
  status:
    | "quoted"
    | "confirmed"
    | "paid"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "returned";
  total_amount: number;
  discount_amount: number;
  payment_method?: string;
  source: "walk-in" | "voice-agent" | "whatsapp" | "website";
  notes?: string;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id?: string;
  quantity: number;
  unit_price: number;
  discount: number;
  product?: Product;
}

export interface Offer {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  discount_type: "percentage" | "flat" | "bundle";
  discount_value: number;
  applicable_to: Record<string, unknown>;
  whatsapp_template_name?: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CallLog {
  id: string;
  tenant_id: string;
  twilio_call_sid?: string;
  caller_phone: string;
  customer_id?: string;
  started_at: string;
  ended_at?: string;
  duration_secs?: number;
  transcript: Array<{ role: string; text: string; ts?: string }>;
  summary?: string;
  outcome?: "sale" | "quote_sent" | "info" | "handoff" | "missed" | "abandoned";
  quote_id?: string;
  customer?: Customer;
}
