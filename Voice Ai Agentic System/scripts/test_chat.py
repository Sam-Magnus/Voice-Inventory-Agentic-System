"""
CLI Test Mode for the Voice Agent.

Type messages in the terminal and the agent responds using:
- Groq/Claude LLM with tool calling
- Live Supabase inventory data
- No Twilio needed — pure text interaction

Usage:
    python scripts/test_chat.py

REMINDER: Currently using Groq (free). Switch to Claude API when you add credits.
"""

import asyncio
import json
import sys
import os

# Fix Windows terminal encoding
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stdin.reconfigure(encoding="utf-8", errors="replace")

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.config import get_settings
from src.agent.llm_client import chat_completion
from src.agent.tools import get_tool_definitions, execute_tool
from src.agent.prompt_builder import build_system_prompt
from src.services.tenant_service import get_tenant_by_id

settings = get_settings()

# Demo tenant ID (Sharma Computers)
DEMO_TENANT_ID = "a1b2c3d4-e5f6-7890-abcd-111111111111"
DEMO_CALLER = "+919811001100"


async def main():
    print("=" * 60)
    print("  ShopFlow AI — Voice Agent Test Mode (CLI)")
    print(f"  LLM: {settings.llm_provider.upper()} ({settings.groq_model if settings.llm_provider == 'groq' else settings.anthropic_model})")
    print(f"  Shop: Sharma Computers (Nehru Place)")
    print("=" * 60)
    print()
    print("  REMINDER: Using Groq (free tier). Switch to Claude API")
    print("  when you add Anthropic credits for production quality.")
    print()
    print("  Type your message as if you're a customer calling the shop.")
    print("  Type 'quit' to exit.")
    print("-" * 60)

    # Load tenant context
    print("\n[Loading shop data from Supabase...]")
    tenant = await get_tenant_by_id(DEMO_TENANT_ID)
    if not tenant:
        print("ERROR: Demo tenant not found. Did you run the seed SQL?")
        return

    # Build system prompt
    system_prompt = await build_system_prompt(
        tenant=tenant,
        customer=None,  # Treat as new customer for demo
        caller_number=DEMO_CALLER,
    )

    print(f"[Loaded: {tenant['name']} — {len(system_prompt)} char prompt]")
    print()

    # Conversation state
    messages: list[dict] = []
    tools = get_tool_definitions()

    # Agent greeting
    greeting = tenant.get("settings", {}).get(
        "greeting",
        f"Hello! Welcome to {tenant['name']}. How can I help you today?"
    )
    print(f"[Agent]: {greeting}")
    print()

    while True:
        # Get user input
        try:
            user_input = input("[You]: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n\nGoodbye!")
            break

        if not user_input:
            continue
        if user_input.lower() in ("quit", "exit", "q"):
            print("\nGoodbye!")
            break

        # Add user message
        messages.append({"role": "user", "content": user_input})

        # Get LLM response (may include tool calls)
        try:
            response = await chat_completion(
                system_prompt=system_prompt,
                messages=messages,
                tools=tools,
                max_tokens=400,
            )
        except Exception as e:
            print(f"\n[ERROR] LLM Error: {e}\n")
            messages.pop()  # Remove failed message
            continue

        # Process tool calls if any
        if response["tool_calls"]:
            # Add assistant message with tool calls (in Anthropic format for state)
            assistant_content = []
            if response["text"]:
                assistant_content.append({"type": "text", "text": response["text"]})
            for tc in response["tool_calls"]:
                assistant_content.append({
                    "type": "tool_use",
                    "id": tc["id"],
                    "name": tc["name"],
                    "input": tc["arguments"],
                })
                print(f"\n  [Tool]: {tc['name']}({json.dumps(tc['arguments'], indent=2)[:200]})")

            messages.append({"role": "assistant", "content": assistant_content})

            # Execute tools
            tool_results = []
            for tc in response["tool_calls"]:
                result = await execute_tool(
                    tool_name=tc["name"],
                    tool_input=tc["arguments"],
                    tenant_id=DEMO_TENANT_ID,
                    caller_number=DEMO_CALLER,
                )
                print(f"  [Result]: {json.dumps(result, indent=2)[:300]}")
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tc["id"],
                    "content": json.dumps(result),
                })

            messages.append({"role": "user", "content": tool_results})

            # Get follow-up response after tool execution
            try:
                followup = await chat_completion(
                    system_prompt=system_prompt,
                    messages=messages,
                    tools=tools,
                    max_tokens=400,
                )
                final_text = followup["text"]

                # Handle nested tool calls (agent may want to call another tool)
                if followup["tool_calls"] and not final_text:
                    # Add this response and execute again
                    assistant_content2 = []
                    for tc in followup["tool_calls"]:
                        assistant_content2.append({
                            "type": "tool_use",
                            "id": tc["id"],
                            "name": tc["name"],
                            "input": tc["arguments"],
                        })
                        print(f"\n  [Tool]: {tc['name']}({json.dumps(tc['arguments'][:200])})")

                    messages.append({"role": "assistant", "content": assistant_content2})
                    tool_results2 = []
                    for tc in followup["tool_calls"]:
                        result = await execute_tool(
                            tool_name=tc["name"],
                            tool_input=tc["arguments"],
                            tenant_id=DEMO_TENANT_ID,
                            caller_number=DEMO_CALLER,
                        )
                        tool_results2.append({
                            "type": "tool_result",
                            "tool_use_id": tc["id"],
                            "content": json.dumps(result),
                        })
                    messages.append({"role": "user", "content": tool_results2})

                    followup2 = await chat_completion(
                        system_prompt=system_prompt,
                        messages=messages,
                        tools=tools,
                        max_tokens=400,
                    )
                    final_text = followup2["text"]

                if final_text:
                    messages.append({"role": "assistant", "content": final_text})
                    print(f"\n[Agent]: {final_text}\n")
                else:
                    print("\n[Agent]: [No response generated]\n")

            except Exception as e:
                print(f"\n[ERROR] Follow-up Error: {e}\n")

        else:
            # Simple text response, no tool calls
            if response["text"]:
                messages.append({"role": "assistant", "content": response["text"]})
                print(f"\n[Agent]: {response['text']}\n")
            else:
                print("\n[Agent]: [No response]\n")


if __name__ == "__main__":
    asyncio.run(main())
