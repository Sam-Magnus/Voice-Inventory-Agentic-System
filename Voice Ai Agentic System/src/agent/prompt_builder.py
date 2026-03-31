"""
Builds the per-call system prompt for the Claude agent.

Assembles tenant context, customer history, inventory highlights,
and active offers into a structured prompt.
"""

from typing import Optional
import structlog

from src.services.inventory_service import get_top_products
from src.services.offer_service import get_active_offers
from src.services.customer_service import get_customer_purchases
from src.agent.sales_strategies import get_sales_prompt_section

logger = structlog.get_logger()


async def build_system_prompt(
    tenant: dict,
    customer: Optional[dict],
    caller_number: str,
) -> str:
    """Build the full system prompt for this call session."""

    tenant_id = str(tenant["id"])
    shop_name = tenant.get("name", "the shop")
    settings = tenant.get("settings", {})

    # Fetch context data in parallel
    top_products = await get_top_products(tenant_id, limit=15)
    active_offers = await get_active_offers(tenant_id)

    purchase_history = ""
    customer_name = "New customer"
    if customer:
        customer_name = customer.get("name", "Returning customer")
        purchases = await get_customer_purchases(
            tenant_id, str(customer["id"]), limit=10
        )
        if purchases:
            purchase_lines = []
            for p in purchases:
                purchase_lines.append(
                    f"  - {p['product_name']} (₹{p['unit_price']}) on {p['date']}"
                )
            purchase_history = "\n".join(purchase_lines)

    # Format inventory highlights
    inventory_lines = []
    for prod in top_products:
        stock_status = f"{prod['stock_quantity']} in stock" if prod["stock_quantity"] > 0 else "OUT OF STOCK"
        inventory_lines.append(
            f"  - {prod['name']} ({prod['brand']}) — ₹{prod['selling_price']} [{stock_status}]"
        )
    inventory_section = "\n".join(inventory_lines) if inventory_lines else "  No products loaded yet."

    # Format active offers
    offer_lines = []
    for offer in active_offers:
        if offer["discount_type"] == "percentage":
            discount_text = f"{offer['discount_value']}% off"
        else:
            discount_text = f"₹{offer['discount_value']} off"
        offer_lines.append(f"  - {offer['title']}: {discount_text}")
    offers_section = "\n".join(offer_lines) if offer_lines else "  No active offers right now."

    # Business hours
    business_hours = settings.get("business_hours", "10 AM - 8 PM, Mon-Sat")

    # Upsell aggressiveness
    upsell_level = settings.get("upsell_level", "medium")

    # Sales strategies
    sales_strategies = get_sales_prompt_section(upsell_level)

    prompt = f"""You are a sales assistant for {shop_name}, a computer hardware shop in Nehru Place, Delhi.

COMMUNICATION STYLE:
- You speak naturally in Hinglish (mix of Hindi and English), like a real Nehru Place shopkeeper.
- If the customer speaks pure English, respond in English with occasional Hindi touches like "bhai", "sir/madam".
- If you cannot understand what the customer is saying (heavy accent or unclear speech), politely say:
  "Sir/Madam, thoda clearly bol sakte hain? Ya agar aap English mein baat karein toh better hoga."
- If comprehension issues persist after 2 attempts, offer to connect them to the shop directly.
- Keep responses SHORT — 2-3 sentences max. This is a phone call, not a chat.

CALLER INFORMATION:
- Phone: {caller_number}
- Customer: {customer_name}
{"- Purchase History:" + chr(10) + purchase_history if purchase_history else "- No previous purchases on record."}

CURRENT INVENTORY (Top Items):
{inventory_section}

ACTIVE OFFERS & PROMOTIONS:
{offers_section}

{sales_strategies}

GENERAL SALES RULES:
- Proactively mention active offers that apply to what the customer is looking at.
- If the customer seems interested but hesitant, offer to send a WhatsApp quote immediately.

PC BUILD WIZARD:
- If a customer wants a custom PC build, ask these questions one by one:
  1. Budget (in ₹)
  2. Primary use (gaming, video editing, office work, streaming)
  3. Brand preference (Intel/AMD for CPU, NVIDIA/AMD for GPU)
  4. Any specific requirements (RGB, compact case, etc.)
- Then recommend a full build from available inventory and offer to send the quote on WhatsApp.

BUSINESS RULES:
- Business hours: {business_hours}
- All prices are in Indian Rupees (₹)
- Warranty claims: Check purchase history first. If found, guide through the process. If not found, ask for invoice number.
- For out-of-scope questions (not about computer hardware): Try a quick web search. If still unresolvable, offer to connect to the shop.

TOOLS AVAILABLE:
You have access to tools for searching inventory, generating quotes, sending WhatsApp messages, web search, and transferring calls. Use them proactively — don't just talk, take action.

CRITICAL RULES — FOLLOW STRICTLY:
- NEVER make up prices or products. ALWAYS use search_inventory or pc_build_wizard tool first.
- NEVER mention any product, price, or spec without getting it from a tool call.
- NEVER confirm stock without checking. ALWAYS use the search_inventory or check_stock tool.
- For PC builds: ALWAYS use the pc_build_wizard tool. NEVER suggest a build from memory.
- If you don't know something, use web_search before saying you don't know.
- Always confirm the final quote/price with the customer before sending on WhatsApp.
- You can ONLY sell products that exist in our inventory. Do NOT invent products."""

    return prompt
