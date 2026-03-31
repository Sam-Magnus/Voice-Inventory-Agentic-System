"""
Chat API endpoint — text-based conversation with the voice agent.
Used by the web dashboard chat UI for testing and demo purposes.
"""

import json
from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel
import structlog

from src.config import get_settings
from src.agent.llm_client import chat_completion
from src.agent.tools import get_tool_definitions, execute_tool
from src.agent.prompt_builder import build_system_prompt
from src.services.tenant_service import get_tenant_by_id
from src.services.customer_service import lookup_customer_by_phone

logger = structlog.get_logger()
settings = get_settings()

router = APIRouter()

# In-memory session store (for demo — use Redis in production)
_sessions: dict[str, dict] = {}

DEMO_TENANT_ID = "a1b2c3d4-e5f6-7890-abcd-111111111111"


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default"
    caller_number: Optional[str] = "+919811001100"


class ChatResponse(BaseModel):
    reply: str
    tools_used: list[str] = []
    session_id: str


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """Send a message to the voice agent and get a text response."""
    session_id = req.session_id or "default"

    # Get or create session
    if session_id not in _sessions:
        tenant = await get_tenant_by_id(DEMO_TENANT_ID)
        if not tenant:
            return ChatResponse(
                reply="Error: Demo tenant not found. Run seed SQL first.",
                session_id=session_id,
            )

        customer = await lookup_customer_by_phone(DEMO_TENANT_ID, req.caller_number)

        system_prompt = await build_system_prompt(
            tenant=tenant,
            customer=customer,
            caller_number=req.caller_number,
        )

        _sessions[session_id] = {
            "system_prompt": system_prompt,
            "messages": [],
            "tenant_name": tenant.get("name", "Shop"),
        }

    session = _sessions[session_id]
    tools = get_tool_definitions()

    # Add user message
    session["messages"].append({"role": "user", "content": req.message})

    try:
        response = await chat_completion(
            system_prompt=session["system_prompt"],
            messages=session["messages"],
            tools=tools,
            max_tokens=400,
        )

        agent_text = response["text"]
        tools_used = []

        # Handle tool calls
        if response["tool_calls"]:
            assistant_content = []
            if agent_text:
                assistant_content.append({"type": "text", "text": agent_text})
            for tc in response["tool_calls"]:
                assistant_content.append({
                    "type": "tool_use",
                    "id": tc["id"],
                    "name": tc["name"],
                    "input": tc["arguments"],
                })
                tools_used.append(tc["name"])

            session["messages"].append({"role": "assistant", "content": assistant_content})

            # Execute tools
            tool_results = []
            for tc in response["tool_calls"]:
                result = await execute_tool(
                    tool_name=tc["name"],
                    tool_input=tc["arguments"],
                    tenant_id=DEMO_TENANT_ID,
                    caller_number=req.caller_number,
                )
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tc["id"],
                    "content": json.dumps(result, default=str),
                })

            session["messages"].append({"role": "user", "content": tool_results})

            # Get follow-up response
            followup = await chat_completion(
                system_prompt=session["system_prompt"],
                messages=session["messages"],
                tools=tools,
                max_tokens=400,
            )
            agent_text = followup["text"]
            session["messages"].append({"role": "assistant", "content": agent_text or ""})
        else:
            session["messages"].append({"role": "assistant", "content": agent_text or ""})

        return ChatResponse(
            reply=agent_text or "I couldn't generate a response. Please try again.",
            tools_used=tools_used,
            session_id=session_id,
        )

    except Exception as e:
        logger.error("Chat error", error=str(e))
        return ChatResponse(
            reply=f"Sorry, I encountered an error. Please try again.",
            session_id=session_id,
        )


@router.delete("/chat/{session_id}")
async def reset_session(session_id: str):
    """Reset a chat session to start fresh."""
    if session_id in _sessions:
        del _sessions[session_id]
    return {"status": "ok", "message": "Session reset"}
