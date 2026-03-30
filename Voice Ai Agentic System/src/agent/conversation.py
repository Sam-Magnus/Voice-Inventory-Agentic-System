"""Conversation state management for a single call session."""

from typing import Any


class ConversationState:
    """Tracks the multi-turn conversation between customer and agent."""

    def __init__(self):
        self.system_prompt: str = ""
        self._messages: list[dict[str, Any]] = []

    def set_system_prompt(self, prompt: str):
        self.system_prompt = prompt

    def add_user_message(self, text: str):
        # Merge consecutive user messages (for multi-utterance turns)
        if self._messages and self._messages[-1]["role"] == "user":
            existing = self._messages[-1]["content"]
            if isinstance(existing, str):
                self._messages[-1]["content"] = f"{existing} {text}"
            return
        self._messages.append({"role": "user", "content": text})

    def add_assistant_message(self, content: Any):
        """Add assistant response (can be text or content blocks from Claude)."""
        if isinstance(content, str):
            self._messages.append({"role": "assistant", "content": content})
        else:
            # Content blocks from Claude API (text + tool_use)
            serialized = []
            for block in content:
                if hasattr(block, "model_dump"):
                    serialized.append(block.model_dump())
                else:
                    serialized.append(block)
            self._messages.append({"role": "assistant", "content": serialized})

    def add_tool_results(self, results: list[dict]):
        self._messages.append({"role": "user", "content": results})

    def get_messages(self) -> list[dict]:
        return self._messages.copy()

    def get_transcript(self) -> list[dict[str, str]]:
        """Get a simplified transcript for logging."""
        transcript = []
        for msg in self._messages:
            if msg["role"] == "user" and isinstance(msg["content"], str):
                transcript.append({"role": "customer", "text": msg["content"]})
            elif msg["role"] == "assistant":
                content = msg["content"]
                if isinstance(content, str):
                    transcript.append({"role": "agent", "text": content})
                elif isinstance(content, list):
                    for block in content:
                        if isinstance(block, dict) and block.get("type") == "text":
                            transcript.append(
                                {"role": "agent", "text": block["text"]}
                            )
        return transcript
