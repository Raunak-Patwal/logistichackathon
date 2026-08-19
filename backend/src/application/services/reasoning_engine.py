import os
from typing import Optional
from src.domain.incident.models import Incident
from src.domain.reasoning.models import ReasoningResult
from src.application.services.reasoning_provider import ReasoningProvider, DeterministicDemoReasoner
from src.application.ai.gemini_reasoner import GeminiReasoningProvider
from src.config.settings import get_settings


class ReasoningEngineService:
    """
    Phase 3 (Reason): AI Root Cause Analysis & Predictive Recovery Planning.
    Orchestrates the ReasoningProvider to deliver explainable decisions.
    Defaults to GeminiReasoningProvider (with native graceful fallback).
    """
    def __init__(self, provider: Optional[ReasoningProvider] = None):
        if provider:
            self.provider = provider
        else:
            settings = get_settings()
            model_name = getattr(settings, "GEMINI_MODEL", "gemini-2.5-flash")
            api_key = getattr(settings, "GEMINI_API_KEY", None) or os.getenv("GEMINI_API_KEY")
            self.provider = GeminiReasoningProvider(model_name=model_name, api_key=api_key)

    async def analyze_incident(self, incident: Incident) -> ReasoningResult:
        return await self.provider.analyze(incident)