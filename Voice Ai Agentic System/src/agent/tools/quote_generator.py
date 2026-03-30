"""Generate an itemized quote for products or PC builds."""

from src.services.order_service import create_quote
from src.services.inventory_service import get_products_by_ids, search_products

TOOL_DEFINITION = {
    "name": "generate_quote",
    "description": "Generate an itemized quote for a list of products or a PC build. Creates a draft order that can be sent via WhatsApp. You can use product IDs (from search results) or product names.",
    "input_schema": {
        "type": "object",
        "properties": {
            "items": {
                "type": "array",
                "description": "List of products. Each item can have product_id (UUID) or product_name (text search)",
                "items": {
                    "type": "object",
                    "properties": {
                        "product_id": {"type": "string", "description": "Product UUID from a previous search result"},
                        "product_name": {"type": "string", "description": "Product name to search for (e.g. 'RTX 4070')"},
                        "quantity": {"type": "integer", "description": "Quantity, defaults to 1"},
                    },
                },
            },
            "customer_name": {
                "type": "string",
                "description": "Customer name for the quote",
            },
            "notes": {
                "type": "string",
                "description": "Additional notes for the quote",
            },
        },
        "required": ["items"],
    },
}


async def generate_quote(
    tenant_id: str,
    caller_number: str,
    items: list[dict],
    customer_name: str = None,
    apply_offer_id: str = None,
    notes: str = None,
    **kwargs,
) -> dict:
    # Resolve products — by ID or by name search
    resolved_products = []

    for item in items:
        product = None
        qty = item.get("quantity", 1)

        if item.get("product_id"):
            products = await get_products_by_ids(tenant_id, [item["product_id"]])
            if products:
                product = products[0]

        elif item.get("product_name"):
            results = await search_products(
                tenant_id=tenant_id,
                query=item["product_name"],
                in_stock_only=True,
            )
            if results:
                product = results[0]  # Best match

        if product:
            resolved_products.append({"product": product, "quantity": qty})

    if not resolved_products:
        return {"success": False, "message": "No valid products found for quote. Please search for products first."}

    # Build line items
    line_items = []
    total = 0
    for rp in resolved_products:
        product = rp["product"]
        qty = rp["quantity"]
        subtotal = float(product["selling_price"]) * qty
        total += subtotal
        line_items.append({
            "product_id": str(product["id"]),
            "product_name": product["name"],
            "brand": product["brand"],
            "quantity": qty,
            "unit_price": float(product["selling_price"]),
            "subtotal": subtotal,
        })

    # Create the quote in the database
    quote = await create_quote(
        tenant_id=tenant_id,
        caller_number=caller_number,
        customer_name=customer_name,
        line_items=line_items,
        total=total,
        offer_id=apply_offer_id,
        notes=notes,
    )

    return {
        "success": True,
        "quote_id": quote.get("id", ""),
        "order_number": quote.get("order_number", ""),
        "line_items": line_items,
        "total": total,
        "message": f"Quote generated for Rs.{total:,.0f}. Ready to send on WhatsApp.",
    }
