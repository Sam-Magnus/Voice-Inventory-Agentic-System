from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_name: str = "Voice Inventory Agent"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8000

    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    database_url: str = ""

    # LLM Provider: "groq" (free) or "anthropic" (paid)
    llm_provider: str = "groq"

    # Groq (free tier - Llama 3.3 70B)
    groq_api_key: str = ""
    groq_model: str = "meta-llama/llama-4-scout-17b-16e-instruct"

    # Anthropic (Claude) — switch to this when you add credits
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-20250514"

    # Deepgram (STT)
    deepgram_api_key: str = ""

    # ElevenLabs (TTS)
    elevenlabs_api_key: str = ""
    elevenlabs_voice_id: str = "CwhRBWXzGAHq8TQ4Fs17"  # Roger - Laid-Back, Casual

    # Twilio
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""

    # WhatsApp (Meta Cloud API)
    whatsapp_access_token: str = ""
    whatsapp_api_version: str = "v21.0"

    # Tavily (Web Search)
    tavily_api_key: str = ""

    # Base URL (for Twilio webhooks)
    base_url: str = "http://localhost:8000"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
