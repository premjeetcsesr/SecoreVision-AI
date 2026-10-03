import os
from providers.base import BaseLLMProvider
from providers.mock_provider import MockProvider
from providers.gemini_provider import GeminiProvider
from providers.ollama_provider import OllamaProvider


def get_llm_provider() -> BaseLLMProvider:
    provider_name = os.getenv("LLM_PROVIDER", "mock").lower().strip()
    if provider_name == "gemini":
        return GeminiProvider()
    elif provider_name == "ollama":
        return OllamaProvider()
    else:
        return MockProvider()
