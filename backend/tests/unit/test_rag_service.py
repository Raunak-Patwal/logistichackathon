import pytest
from unittest.mock import AsyncMock, MagicMock
from src.domain.incident.models import Incident, LogisticsContext
from src.domain.reasoning.models import ReasoningResult, RootCauseAnalysis, RecoveryOption
from src.application.ai.rag_service import IncidentRAGService, rag_service
from src.application.ai.gemini_reasoner import GeminiReasoningProvider


@pytest.mark.asyncio
async def test_rag_service_embedding_generation():
    """Verifies that RAG service generates 768-dimensional embeddings."""
    rag = IncidentRAGService(api_key=None)
    emb = await rag._get_embedding("Delhi W12 Scanner Hardware Failure")
    assert isinstance(emb, list)
    assert len(emb) == 768
    assert all(isinstance(x, (float, int)) for x in emb)


@pytest.mark.asyncio
async def test_rag_service_store_and_retrieve_memory(test_session):
    """Verifies that RAG service stores incident memories and retrieves historical matches."""
    rag = IncidentRAGService(api_key=None)

    # Store memory
    await rag.store_incident_memory(
        session=test_session,
        incident_id="INC-RAG-TEST",
        context_summary="Optical Scanner Failure at W12 with 540 delayed parcels",
        resolution_notes="Activated Backup Scanner Bay B. Recovered in 6 mins.",
    )

    # Retrieve similar
    matches = await rag.get_similar_historical_incidents(
        session=test_session,
        current_context_text="Scanner optical failure at warehouse dock",
        limit=2,
    )
    assert isinstance(matches, list)
    assert len(matches) >= 1
    assert any("Scanner" in m for m in matches)


@pytest.mark.asyncio
async def test_gemini_reasoner_with_rag_historical_precedence(test_session):
    """Verifies that GeminiReasoningProvider retrieves and injects RAG context into prompts."""
    provider = GeminiReasoningProvider(api_key="dummy-key")

    mock_rca = RootCauseAnalysis(
        cause_chain=["Optical sensor diode failure", "Brownout triggered shutdown"],
        probable_root_cause="Brownout on dock subpanel B damaged optical board",
        confidence_percent=94.0,
        supporting_evidence=["RAG Precedence from INC-7801 shows identical failure pattern"],
        what_happened="Scanner offline.",
        expected_consequences="Cascading truck queue.",
    )
    mock_options = [
        RecoveryOption(
            option_id="OPT-RAG-1",
            action_type="ACTIVATE_BACKUP_SCANNER",
            action_title="Activate Redundant Scanner Bay B (Validated by Past Incident INC-7801)",
            description="Switch conveyor to Bay B redundant optical line.",
            eta_mins=6,
            cost_estimate_inr=1500.0,
            risk_level="Low",
            expected_benefit="Restores throughput in 6 mins (99.8% past success rate)",
            is_recommended=True,
        )
    ]
    mock_result = ReasoningResult(
        incident_id="INC-8921",
        warehouse_id="W12",
        root_cause_analysis=mock_rca,
        recovery_plan=mock_options,
        reasoning_mode="GEMINI_2_5_FLASH_RAG",
    )

    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.parsed = mock_result
    mock_client.aio.models.generate_content = AsyncMock(return_value=mock_response)
    provider.client = mock_client

    context = LogisticsContext(warehouse_capacity_percent=95.0, cold_storage_parcels=18)
    result = await provider.analyze_incident(context, incident_id="INC-8921", warehouse_id="W12")

    assert result.incident_id == "INC-8921"
    assert result.root_cause_analysis.confidence_percent == 94.0
    assert "GEMINI" in result.reasoning_mode
    # Ensure generate_content was called with prompt containing RAG historical guidance
    call_args = mock_client.aio.models.generate_content.call_args
    prompt_text = call_args.kwargs.get("contents") or call_args[1].get("contents")
    assert "Incident ID: INC-8921" in prompt_text
