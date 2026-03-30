"""Check real-time stock for a specific product."""

from src.services.inventory_service import get_product_stock

TOOL_DEFINITION = {
    "name": "check_stock",
    "description": "Check real-time stock availability for a specific product by name or ID.",
    "input_schema": {
        "type": "object",
        "properties": {
            "product_name": {
                "type": "string",
                "description": "Product name to check stock for",
            },
            "product_id": {
                "type": "string",
                "description": "Product ID if known",
            },
        },
        "required": [],
    },
}


async def check_stock(
    tenant_id: str,
    caller_number: str,
    product_name: str = None,
    product_id: str = None,
    **kwargs,
) -> dict:
    result = await get_product_stock(
        tenant_id=tenant_id,
        product_name=product_name,
        product_id=product_id,
    )

    if not result:
        return {"available": False, "message": "Product not found in inventory."}

    return {
        "available": result["stock_quantity"] > 0,
        "product_name": result["name"],
        "stock_quantity": result["stock_quantity"],
        "price": result["selling_price"],
    }
