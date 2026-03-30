"""Search products in the shop's inventory."""

from src.services.inventory_service import search_products

TOOL_DEFINITION = {
    "name": "search_inventory",
    "description": "Search products in the shop's inventory by name, category, brand, or specs. Use this whenever a customer asks about a product, price, or availability.",
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Search query, e.g. 'RTX 4070' or 'gaming motherboard under 15000'",
            },
            "category": {
                "type": "string",
                "description": "Filter by category: 'gpu', 'cpu', 'motherboard', 'ram', 'ssd', 'psu', 'cabinet', 'monitor', 'keyboard', 'mouse'",
            },
            "brand": {
                "type": "string",
                "description": "Filter by brand, e.g. 'nvidia', 'amd', 'intel', 'corsair'",
            },
            "max_price": {
                "type": "string",
                "description": "Maximum price in INR (e.g. '50000')",
            },
        },
        "required": ["query"],
    },
}


async def search_inventory(
    tenant_id: str,
    caller_number: str,
    query: str,
    category: str = None,
    brand: str = None,
    max_price: float = None,
    in_stock_only: bool = True,
    **kwargs,
) -> dict:
    results = await search_products(
        tenant_id=tenant_id,
        query=query,
        category=category,
        brand=brand,
        max_price=max_price,
        in_stock_only=in_stock_only,
    )

    if not results:
        return {
            "found": False,
            "message": "No matching products found.",
            "suggestion": "Try broadening your search or check alternative brands.",
        }

    products = []
    for p in results[:5]:  # Return top 5 matches
        products.append(
            {
                "id": str(p["id"]),
                "name": p["name"],
                "brand": p["brand"],
                "price": p["selling_price"],
                "mrp": p["mrp"],
                "stock": p["stock_quantity"],
                "specs": p.get("specs", {}),
                "in_stock": p["stock_quantity"] > 0,
            }
        )

    return {"found": True, "count": len(products), "products": products}
