"""
Sales strategies for upselling, cross-selling, and out-of-stock handling.

These rules are injected into the system prompt to guide the agent's behavior.
"""

# Upsell rules: when customer asks for X, suggest Y
UPSELL_RULES = {
    "gpu": [
        {"trigger": "RTX 4060", "suggest": "RTX 4060 Ti", "pitch": "Sirf {price_diff} zyada mein 20% better performance milega, 1440p gaming bhi smooth chalega"},
        {"trigger": "RTX 4060 Ti", "suggest": "RTX 4070", "pitch": "Sirf {price_diff} zyada mein 12GB VRAM aur ray tracing performance milega"},
        {"trigger": "RTX 4070", "suggest": "RTX 4070 Ti Super", "pitch": "16GB VRAM ke saath 4K gaming bhi possible hai, future-proof hai"},
        {"trigger": "RX 7600", "suggest": "RX 7800 XT", "pitch": "16GB VRAM milega, 1440p gaming ke liye best value hai"},
    ],
    "cpu": [
        {"trigger": "i5-14400F", "suggest": "i5-14600KF", "pitch": "Overclocking support milega aur 4 extra cores, heavy multitasking ke liye best"},
        {"trigger": "i5-14600KF", "suggest": "i7-14700KF", "pitch": "20 cores milenge, streaming + gaming ek saath without lag"},
        {"trigger": "Ryzen 5 7600X", "suggest": "Ryzen 7 7800X3D", "pitch": "3D V-Cache se gaming performance mein 20-30% boost milega"},
    ],
    "ram": [
        {"trigger": "16GB", "suggest": "32GB", "pitch": "Aajkal games aur Chrome mein 16GB kam padta hai, 32GB se future-proof rahega"},
    ],
    "ssd": [
        {"trigger": "1TB", "suggest": "2TB", "pitch": "Ek-do AAA games mein hi 1TB bhar jaata hai, 2TB le lo tension-free"},
    ],
}

# Cross-sell bundles: when customer buys X, suggest Y
CROSS_SELL_BUNDLES = [
    {
        "trigger_category": "cpu",
        "suggest_categories": ["motherboard", "ram"],
        "pitch": "CPU ke saath motherboard aur RAM ka combo loge toh 10% discount milega — PC Build Combo Offer chal raha hai",
    },
    {
        "trigger_category": "gpu",
        "suggest_categories": ["psu"],
        "pitch": "Naye GPU ke saath PSU upgrade bhi dekh lo — underpowered PSU se GPU damage ho sakta hai",
    },
    {
        "trigger_category": "motherboard",
        "suggest_categories": ["ssd"],
        "pitch": "Is motherboard mein M.2 slot hai — NVMe SSD le lo, boot time 10 seconds ho jayega",
    },
]

# Out-of-stock alternatives: when X is unavailable, suggest Y
OUT_OF_STOCK_ALTERNATIVES = {
    "nvidia_gpu": {
        "pitch": "NVIDIA stock mein nahi hai abhi, lekin AMD ka {alternative} hai jo same price range mein aur bahut accha performer hai",
        "mappings": {
            "RTX 4060": "RX 7600",
            "RTX 4070": "RX 7800 XT",
        },
    },
    "amd_gpu": {
        "pitch": "AMD GPU abhi available nahi hai, lekin NVIDIA ka {alternative} available hai — DLSS support bhi milega",
        "mappings": {
            "RX 7600": "RTX 4060",
            "RX 7800 XT": "RTX 4070",
        },
    },
}

# Negotiation tactics
NEGOTIATION_TACTICS = [
    "If customer says price is too high: mention MRP discount (\"MRP {mrp} hai, hum {price} de rahe hain — already {discount}% off hai\")",
    "If customer is comparing with online: \"Online mein warranty claim karna mushkil hai. Yahan pe walk-in warranty milegi, plus installation free\"",
    "If customer is hesitant: \"Abhi offer chal raha hai, next week se price badh sakta hai. Aaj le lo toh best deal milegi\"",
    "If customer wants to think: \"Main aapko WhatsApp pe quote bhej deta hoon with all details, aap araam se decide karo\"",
]


def get_sales_prompt_section(upsell_level: str = "medium") -> str:
    """Generate the sales strategies section for the system prompt."""
    sections = []

    if upsell_level in ("medium", "high"):
        sections.append("UPSELL PLAYBOOK:")
        for category, rules in UPSELL_RULES.items():
            for rule in rules:
                sections.append(f"  - If customer asks about {rule['trigger']}: suggest {rule['suggest']} (\"{rule['pitch']}\")")

    if upsell_level == "high":
        sections.append("\nCROSS-SELL BUNDLES:")
        for bundle in CROSS_SELL_BUNDLES:
            sections.append(f"  - When selling {bundle['trigger_category']}: suggest {', '.join(bundle['suggest_categories'])} (\"{bundle['pitch']}\")")

        sections.append("\nNEGOTIATION TACTICS:")
        for tactic in NEGOTIATION_TACTICS:
            sections.append(f"  - {tactic}")

    sections.append("\nOUT-OF-STOCK HANDLING:")
    sections.append("  - NEVER say 'sorry we don't have it'. ALWAYS suggest an available alternative.")
    sections.append("  - Frame alternatives positively: 'Actually, humere paas isse bhi better option hai...'")

    return "\n".join(sections)
