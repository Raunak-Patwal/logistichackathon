import pytest
from src.application.services.context_builder import ContextBuilderService
from src.application.services.reasoning_engine import ReasoningEngineService
from src.application.services.action_service import ActionExecutionService
from src.infrastructure.repositories.incident_repository import IncidentRepository
from src.infrastructure.repositories.world_model_repository import WorldModelRepository


@pytest.mark.asyncio
async def test_full_incident_intelligence_cycle(test_session):
    """
    Tests the complete Observe -> Understand -> Reason -> Decide -> Act loop:
    1. Generate context dossier with ContextBuilderService
    2. Run AI Reasoning Engine (RCA + 3 Ranked Recovery Options)
    3. Select Option A (Activate Backup Scanner) and execute via ActionExecutionService
    4. Verify World Model status restored to OPTIMAL and Incident resolved
    """
    context_service = ContextBuilderService(test_session)
    reasoning_engine = ReasoningEngineService()
    action_service = ActionExecutionService(test_session)
    wm_repo = WorldModelRepository(test_session)
    inc_repo = IncidentRepository(test_session)

    # 1. Understand (Context Dossier)
    incident_ctx = await context_service.generate_incident_context(
        incident_id="INC-8921",
        incident_type="Scanner Hardware Failure",
        warehouse_id="W12",
    )
    assert incident_ctx.incident_id == "INC-8921"
    assert incident_ctx.warehouse_id == "W12"
    assert incident_ctx.context.warehouse_capacity_percent >= 90.0
    assert incident_ctx.context.cold_storage_parcels > 0

    # 2. Reason (AI Root Cause Analysis & Decision Matrix)
    reasoning_result = await reasoning_engine.analyze_incident(incident_ctx)
    assert reasoning_result.root_cause_analysis.confidence_percent > 80.0
    assert len(reasoning_result.recovery_plan) >= 2
    top_option = next(opt for opt in reasoning_result.recovery_plan if opt.is_recommended)
    assert top_option.option_id == "OPTION_A"
    assert top_option.action_type == "ACTIVATE_BACKUP_SCANNER"

    # 3. Decide & Act (Operator executes recommended action)
    action_res = await action_service.execute_action(
        incident_id="INC-8921",
        action_type=top_option.action_type,
        action_title=top_option.action_title,
        description=top_option.description,
        target_entity_id="W12",
        cost_estimate_inr=top_option.cost_estimate_inr,
        eta_mins=top_option.eta_mins,
    )
    assert action_res["status"] == "EXECUTED"
    assert action_res["incident_status"] == "RESOLVED"

    # 4. Verify World Model state
    wh = await wm_repo.get_warehouse_by_id("W12")
    assert wh.status == "OPTIMAL"

    # 5. Verify incident audit log
    inc = await inc_repo.get_by_id("INC-8921")
    assert inc.status == "RESOLVED"
    assert inc.resolved_at is not None
