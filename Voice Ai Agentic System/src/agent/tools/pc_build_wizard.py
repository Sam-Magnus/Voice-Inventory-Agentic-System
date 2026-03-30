"""PC Build Wizard — recommends custom builds based on budget and use case."""

from src.services.inventory_service import search_products

TOOL_DEFINITION = {
    "name": "pc_build_wizard",
    "description": "Generate a PC build recommendation based on the customer's budget, use case, and preferences. Uses available inventory to suggest components.",
    "input_schema": {
        "type": "object",
        "properties": {
            "budget": {
                "type": "string",
                "description": "Total budget in INR (e.g. '80000' or '100000')",
            },
            "use_case": {
                "type": "string",
                "enum": ["gaming", "editing", "office", "streaming", "general"],
                "description": "Primary use case for the PC",
            },
            "brand_preference": {
                "type": "string",
                "description": "CPU brand preference: 'intel', 'amd', or 'no preference'",
            },
            "gpu_preference": {
                "type": "string",
                "description": "GPU brand preference: 'nvidia', 'amd', or 'no preference'",
            },
            "specific_requirements": {
                "type": "string",
                "description": "Any specific requirements like 'RGB lighting', 'compact build', 'white theme'",
            },
        },
        "required": ["budget", "use_case"],
    },
}

# Budget allocation percentages by use case
BUDGET_ALLOCATION = {
    "gaming": {"cpu": 0.20, "gpu": 0.32, "motherboard": 0.15, "ram": 0.08, "ssd": 0.07, "psu": 0.08, "cabinet": 0.06, "cooler": 0.04},
    "editing": {"cpu": 0.28, "gpu": 0.22, "motherboard": 0.15, "ram": 0.12, "ssd": 0.10, "psu": 0.06, "cabinet": 0.04, "cooler": 0.03},
    "office": {"cpu": 0.25, "gpu": 0.10, "motherboard": 0.18, "ram": 0.15, "ssd": 0.12, "psu": 0.10, "cabinet": 0.05, "cooler": 0.05},
    "streaming": {"cpu": 0.22, "gpu": 0.28, "motherboard": 0.15, "ram": 0.10, "ssd": 0.08, "psu": 0.07, "cabinet": 0.05, "cooler": 0.05},
    "general": {"cpu": 0.22, "gpu": 0.18, "motherboard": 0.16, "ram": 0.12, "ssd": 0.12, "psu": 0.08, "cabinet": 0.07, "cooler": 0.05},
}


async def pc_build_wizard(
    tenant_id: str,
    caller_number: str,
    budget: float,
    use_case: str = "general",
    brand_preference: str = None,
    gpu_preference: str = None,
    specific_requirements: str = None,
    **kwargs,
) -> dict:
    allocation = BUDGET_ALLOCATION.get(use_case, BUDGET_ALLOCATION["general"])

    build = []
    total_cost = 0

    # Search for each component category within budget
    for component, pct in allocation.items():
        component_budget = budget * pct

        # Map component to multiple search terms (tries each until results found)
        search_terms = {
            "cpu": ["Core i5", "Core i7", "Ryzen 5", "Ryzen 7"] if not brand_preference or brand_preference == "no preference"
                   else (["Core i5", "Core i7", "Core i9"] if brand_preference.lower() == "intel" else ["Ryzen 5", "Ryzen 7", "Ryzen 9"]),
            "gpu": ["GeForce RTX", "Radeon RX"] if not gpu_preference or gpu_preference == "no preference"
                   else (["GeForce RTX"] if gpu_preference.lower() == "nvidia" else ["Radeon RX"]),
            "motherboard": ["B760", "B650", "motherboard"],
            "ram": ["DDR5", "Vengeance", "Trident"],
            "ssd": ["NVMe", "SSD", "980 Pro", "SN770"],
            "psu": ["RM750", "RM850", "750W", "850W"],
            "cabinet": ["Lancool", "NZXT H5", "Flow", "Mid Tower"],
            "cooler": ["AK620", "Kraken", "Cooler"],
        }

        brand = None
        if component == "cpu" and brand_preference and brand_preference != "no preference":
            brand = brand_preference
        elif component == "gpu" and gpu_preference and gpu_preference != "no preference":
            brand = gpu_preference

        # Try each search term until we find results
        terms = search_terms.get(component, [component])
        # Allow more budget flex for smaller components
        flex = 1.5 if component in ("psu", "cabinet", "cooler", "motherboard") else 1.2
        results = []
        for query in terms:
            results = await search_products(
                tenant_id=tenant_id,
                query=query,
                brand=brand,
                max_price=component_budget * flex,
                in_stock_only=True,
            )
            if results:
                break

        if results:
            # Pick the best option (highest price within budget for value)
            best = None
            for r in results:
                if r["selling_price"] <= component_budget * flex:
                    if not best or r["selling_price"] > best["selling_price"]:
                        best = r

            if best:
                build.append(
                    {
                        "component": component.upper(),
                        "product_id": str(best["id"]),
                        "name": best["name"],
                        "brand": best["brand"],
                        "price": best["selling_price"],
                    }
                )
                total_cost += best["selling_price"]

    if not build:
        return {
            "success": False,
            "message": f"Could not find components in inventory for a ₹{budget:,.0f} {use_case} build. Consider adjusting budget or checking with the shop directly.",
        }

    return {
        "success": True,
        "use_case": use_case,
        "budget": budget,
        "build": build,
        "total_cost": total_cost,
        "under_budget": budget - total_cost > 0,
        "savings": max(0, budget - total_cost),
        "message": f"Recommended {use_case} build: ₹{total_cost:,.0f} ({len(build)} components). {'Under budget by ₹' + f'{budget - total_cost:,.0f}' if budget > total_cost else 'Slightly over budget.'}",
    }
