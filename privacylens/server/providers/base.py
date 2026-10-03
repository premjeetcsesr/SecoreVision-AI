from abc import ABC, abstractmethod
from schemas import AgentStepRequest, AgentStepResponse


class BaseLLMProvider(ABC):
    """Abstract base class for PrivacyLens LLM/VLM agent providers."""

    @abstractmethod
    async def generate_action(self, request: AgentStepRequest) -> AgentStepResponse:
        """
        Takes sanitized context (sanitized DOM + typed placeholders + optional redacted image)
        and outputs a strictly validated next action for the browser extension.
        """
        pass
