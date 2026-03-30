"""
LLM Client — supports Groq (free) and Anthropic Claude (paid).

Switch between providers by setting LLM_PROVIDER in .env.
Groq uses the OpenAI-compatible API, so tool calling works the same way.
"""

import json
from typing import Any
import structlog

from src.config import get_settings

logger = structlog.get_logger()
settings = get_settings()


def _convert_tools_to_openai_format(tools: list[dict]) -> list[dict]:
    """Convert Anthropic-style tool defs to OpenAI/Groq function calling format."""
    openai_tools = []
    for tool in tools:
        openai_tools.append({
            "type": "function",
            "function": {
                "name": tool["name"],
                "description": tool["description"],
                "parameters": tool["input_schema"],
            },
        })
    return openai_tools


async def chat_completion(
    system_prompt: str,
    messages: list[dict],
    tools: list[dict] | None = None,
    max_tokens: int = 300,
) -> dict:
    """
    Send a chat completion request to the configured LLM provider.

    Returns a normalized response:
    {
        "text": "response text",
        "tool_calls": [{"name": "...", "id": "...", "arguments": {...}}],
    }
    """
    provider = settings.llm_provider

    if provider == "groq":
        return await _groq_completion(system_prompt, messages, tools, max_tokens)
    elif provider == "anthropic":
        return await _anthropic_completion(system_prompt, messages, tools, max_tokens)
    else:
        raise ValueError(f"Unknown LLM provider: {provider}")


async def _groq_completion(
    system_prompt: str,
    messages: list[dict],
    tools: list[dict] | None,
    max_tokens: int,
) -> dict:
    from groq import AsyncGroq

    client = AsyncGroq(api_key=settings.groq_api_key)

    # Build messages in OpenAI format
    groq_messages = [{"role": "system", "content": system_prompt}]

    for msg in messages:
        role = msg["role"]
        content = msg["content"]

        if role == "user" and isinstance(content, str):
            groq_messages.append({"role": "user", "content": content})

        elif role == "user" and isinstance(content, list):
            # Tool results from previous turn
            for item in content:
                if isinstance(item, dict) and item.get("type") == "tool_result":
                    groq_messages.append({
                        "role": "tool",
                        "tool_call_id": item["tool_use_id"],
                        "content": item["content"] if isinstance(item["content"], str) else json.dumps(item["content"]),
                    })

        elif role == "assistant":
            if isinstance(content, str):
                groq_messages.append({"role": "assistant", "content": content})
            elif isinstance(content, list):
                # Content blocks with text + tool_use
                text_parts = []
                tool_calls = []
                for block in content:
                    if isinstance(block, dict):
                        if block.get("type") == "text":
                            text_parts.append(block["text"])
                        elif block.get("type") == "tool_use":
                            tool_calls.append({
                                "id": block["id"],
                                "type": "function",
                                "function": {
                                    "name": block["name"],
                                    "arguments": json.dumps(block["input"]),
                                },
                            })

                msg_data: dict[str, Any] = {"role": "assistant"}
                if text_parts:
                    msg_data["content"] = " ".join(text_parts)
                else:
                    msg_data["content"] = ""
                if tool_calls:
                    msg_data["tool_calls"] = tool_calls
                groq_messages.append(msg_data)

    # Make the API call
    kwargs: dict[str, Any] = {
        "model": settings.groq_model,
        "messages": groq_messages,
        "max_tokens": max_tokens,
        "temperature": 0.7,
    }

    if tools:
        kwargs["tools"] = _convert_tools_to_openai_format(tools)
        kwargs["tool_choice"] = "auto"
        kwargs["parallel_tool_calls"] = False

    try:
        response = await client.chat.completions.create(**kwargs)
    except Exception as e:
        error_msg = str(e)
        # If Groq rejects tool call due to type mismatch, retry without tools
        # and let the model respond in plain text
        if "tool_use_failed" in error_msg or "tool call validation" in error_msg:
            logger.warning("Groq tool call failed, retrying without tools", error=error_msg[:150])
            groq_messages.append({
                "role": "user",
                "content": "(Note: your previous tool call had a formatting error. Please respond in plain text instead, using the information you already have.)",
            })
            kwargs.pop("tools", None)
            kwargs.pop("tool_choice", None)
            kwargs.pop("parallel_tool_calls", None)
            kwargs["messages"] = groq_messages
            response = await client.chat.completions.create(**kwargs)
        else:
            raise

    # Normalize response
    choice = response.choices[0]
    result: dict[str, Any] = {"text": "", "tool_calls": []}

    if choice.message.content:
        result["text"] = choice.message.content

    if choice.message.tool_calls:
        for tc in choice.message.tool_calls:
            result["tool_calls"].append({
                "name": tc.function.name,
                "id": tc.id,
                "arguments": json.loads(tc.function.arguments),
            })

    return result


async def _anthropic_completion(
    system_prompt: str,
    messages: list[dict],
    tools: list[dict] | None,
    max_tokens: int,
) -> dict:
    import anthropic

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    kwargs: dict[str, Any] = {
        "model": settings.anthropic_model,
        "max_tokens": max_tokens,
        "system": system_prompt,
        "messages": messages,
    }

    if tools:
        kwargs["tools"] = tools

    response = await client.messages.create(**kwargs)

    result: dict[str, Any] = {"text": "", "tool_calls": []}

    for block in response.content:
        if block.type == "text":
            result["text"] += block.text
        elif block.type == "tool_use":
            result["tool_calls"].append({
                "name": block.name,
                "id": block.id,
                "arguments": block.input,
            })

    return result
