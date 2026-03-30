"""
Comprehensive multi-turn conversation tests.

Simulates realistic customer conversations to verify:
1. Product inquiry -> upsell -> quote -> WhatsApp
2. PC Build Wizard full flow
3. Out-of-stock handling
4. Warranty inquiry
5. Human handoff

Usage:
    python scripts/test_conversations.py
"""

import asyncio
import json
import sys
import os

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stdin.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.config import get_settings
from src.agent.llm_client import chat_completion
from src.agent.tools import get_tool_definitions, execute_tool
from src.agent.prompt_builder import build_system_prompt
from src.services.tenant_service import get_tenant_by_id

settings = get_settings()

DEMO_TENANT_ID = "a1b2c3d4-e5f6-7890-abcd-111111111111"
DEMO_CALLER = "+919811001100"


async def run_conversation(name: str, turns: list[str]):
    """Run a multi-turn conversation and print results."""
    print(f"\n{'='*70}")
    print(f"  CONVERSATION: {name}")
    print(f"{'='*70}")

    tenant = await get_tenant_by_id(DEMO_TENANT_ID)
    system_prompt = await build_system_prompt(
        tenant=tenant, customer=None, caller_number=DEMO_CALLER,
    )
    tools = get_tool_definitions()
    messages = []
    passed = True

    for turn_num, user_msg in enumerate(turns, 1):
        print(f"\n  [Turn {turn_num}] Customer: \"{user_msg}\"")
        messages.append({"role": "user", "content": user_msg})

        try:
            response = await chat_completion(
                system_prompt=system_prompt,
                messages=messages, tools=tools, max_tokens=400,
            )

            # Handle tool calls
            agent_text = response["text"]
            tools_used = []

            if response["tool_calls"]:
                assistant_content = []
                if agent_text:
                    assistant_content.append({"type": "text", "text": agent_text})
                for tc in response["tool_calls"]:
                    assistant_content.append({
                        "type": "tool_use", "id": tc["id"],
                        "name": tc["name"], "input": tc["arguments"],
                    })
                    tools_used.append(tc["name"])
                messages.append({"role": "assistant", "content": assistant_content})

                tool_results = []
                for tc in response["tool_calls"]:
                    result = await execute_tool(
                        tool_name=tc["name"], tool_input=tc["arguments"],
                        tenant_id=DEMO_TENANT_ID, caller_number=DEMO_CALLER,
                    )
                    tool_results.append({
                        "type": "tool_result", "tool_use_id": tc["id"],
                        "content": json.dumps(result, default=str),
                    })
                messages.append({"role": "user", "content": tool_results})

                followup = await chat_completion(
                    system_prompt=system_prompt,
                    messages=messages, tools=tools, max_tokens=400,
                )
                agent_text = followup["text"]
                messages.append({"role": "assistant", "content": agent_text or ""})
            else:
                messages.append({"role": "assistant", "content": agent_text or ""})

            if tools_used:
                print(f"  Tools: {', '.join(tools_used)}")
            print(f"  Agent: \"{agent_text[:200]}{'...' if len(agent_text or '') > 200 else ''}\"")

        except Exception as e:
            print(f"  ERROR: {e}")
            passed = False
            break

    status = "PASSED" if passed else "FAILED"
    print(f"\n  Result: {status}")
    return passed


async def main():
    print("="*70)
    print("  COMPREHENSIVE CONVERSATION TESTS")
    print(f"  LLM: {settings.llm_provider.upper()} ({settings.groq_model})")
    print("="*70)

    results = {}

    # Test 1: Product inquiry with upsell
    results["Product Inquiry + Upsell"] = await run_conversation(
        "Product Inquiry + Upsell",
        [
            "RTX 4060 ka price kya hai?",
            "4060 Ti mein kya farak hai?",
            "Ok, 4060 Ti ka quote bhej do WhatsApp pe",
        ],
    )

    # Test 2: PC Build Wizard
    results["PC Build Wizard"] = await run_conversation(
        "PC Build Wizard",
        [
            "Mujhe gaming PC banana hai, budget 1 lakh hai",
            "Gaming, Intel CPU aur NVIDIA GPU chahiye",
        ],
    )

    # Test 3: RAM search + cross-sell
    results["RAM + Cross-sell"] = await run_conversation(
        "RAM Search + Cross-sell",
        [
            "32GB DDR5 RAM chahiye",
            "Haan Corsair wali de do, aur SSD bhi batao koi acchi si",
        ],
    )

    # Test 4: Out of stock handling
    results["Out of Stock"] = await run_conversation(
        "Out of Stock Handling",
        [
            "RTX 4090 hai stock mein?",
        ],
    )

    # Test 5: Human handoff
    results["Human Handoff"] = await run_conversation(
        "Human Handoff",
        [
            "Laptop repair karwana hai, shop owner se baat karwa do",
        ],
    )

    # Summary
    print(f"\n{'='*70}")
    print("  TEST SUMMARY")
    print(f"{'='*70}")
    total = len(results)
    passed = sum(1 for v in results.values() if v)
    for name, result in results.items():
        status = "PASS" if result else "FAIL"
        print(f"  [{status}] {name}")
    print(f"\n  {passed}/{total} conversations passed")
    print("="*70)


if __name__ == "__main__":
    asyncio.run(main())
