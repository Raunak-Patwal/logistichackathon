import pytest
from unittest.mock import AsyncMock, MagicMock
from src.domain.incident.models import Incident, LogisticsContext
from src.domain.reasoning.models import ReasoningResult, RootCauseAnalysis, RecoveryOption
from src.application.ai.gemini_reasoner import GeminiReasoningProvider
from src.application.services.reasoning_engine import ReasoningEngineService


@pytest.mark.asyncio
async def test_gemini_reasoner_fallback_without_api_key():
    """Verifies that GeminiReasoningProvider degrades gracefully without an API key."""
    provider = GeminiReasoningProvider(api_key=None)
    context = LogisticsContext(
        warehouse_capacity_percent=95.0,
        cold_storage_parcels=18,
        medicine_shipments=12,
        next_truck_eta_mins=14,
        nearest_backup_scanner="Scanner Bay B",
    )
    result = await provider.analyze_incident(context, incident_id="INC-TEST", warehouse_id="W12")
    assert isinstance(result, ReasoningResult)
    assert result.incident_id == "INC-TEST"
    assert result.warehouse_id == "W12"
    assert result.reasoning_mode == "DETERMINISTIC_FALLBACK"
    assert result.root_cause_analysis.confidence_percent > 80.0
    assert len(result.recovery_plan) == 3
    assert result.recovery_plan[0].is_recommended is True


@pytest.mark.asyncio
async def test_gemini_reasoner_with_mocked_gemini_client():
    """Verifies that GeminiReasoningProvider correctly parses and returns Pydantic structured output."""
    provider = GeminiReasoningProvider(model_name="gemini-2.5-flash", api_key="dummy-key")
    
    mock_rca = RootCauseAnalysis(
        cause_chain=["Overvoltage on dock subpanel", "Scanner power supply tripped"],
        probable_root_cause="Power surge damaged Zebra ZT411 optical sensor board",
        confidence_percent=92.5,
        supporting_evidence=["Line voltage spiked to 275V at 14:02 UTC"],
        what_happened="Scanner offline due to electrical surge.",
        expected_consequences="Outbound conveyor stalled, staging area at 95% capacity.",
    )
    mock_options = [
        RecoveryOption(
            option_id="OPT-1",
            action_type="ACTIVATE_BACKUP_SCANNER",
            action_title="Switch to Redundant Scanner Bay B",
            description="Re-route conveyor belts to Scanner Bay B.",
            eta_mins=5,
            cost_estimate_inr=1200.0,
            risk_level="Low",
            expected_benefit="Restores throughput in 5 mins",
            is_recommended=True,
        )
    ]
    mock_reasoning_result = ReasoningResult(
        incident_id="INC-8921",
        warehouse_id="W12",
        root_cause_analysis=mock_rca,
        recovery_plan=mock_options,
        reasoning_mode="GEMINI_2_5_FLASH",
    )

    # Mock the client response
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.parsed = mock_reasoning_result
    mock_client.aio.models.generate_content = AsyncMock(return_value=mock_response)
    provider.client = mock_client

    context = LogisticsContext()
    result = await provider.analyze_incident(context, incident_id="INC-8921", warehouse_id="W12")

    assert result.incident_id == "INC-8921"
    assert result.warehouse_id == "W12"
    assert result.root_cause_analysis.confidence_percent == 92.5
    assert result.root_cause_analysis.probable_root_cause == "Power surge damaged Zebra ZT411 optical sensor board"
    assert result.recovery_plan[0].action_title == "Switch to Redundant Scanner Bay B"
    assert "GEMINI" in result.reasoning_mode
    assert "RAG" in result.reasoning_mode


@pytest.mark.asyncio
async def test_reasoning_engine_service_orchestration():
    """Verifies that ReasoningEngineService invokes the Gemini provider smoothly."""
    service = ReasoningEngineService()
    incident = Incident(
        incident_id="INC-8921",
        warehouse_id="W12",
        incident_type="Scanner Hardware Failure",
        context=LogisticsContext(warehouse_capacity_percent=95.0),
    )
    result = await service.analyze_incident(incident)
    assert isinstance(result, ReasoningResult)
    assert result.incident_id == "INC-8921"
    assert len(result.recovery_plan) >= 1
