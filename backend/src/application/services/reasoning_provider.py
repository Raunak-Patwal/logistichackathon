from abc import ABC, abstractmethod
from typing import Optional
from src.domain.incident.models import Incident
from src.domain.reasoning.models import ReasoningResult, RootCauseAnalysis, RecoveryOption


class ReasoningProvider(ABC):
    """
    Abstract interface for AI reasoning engines (Rule 18).
    Allows plugging in deterministic local logic or LLM services seamlessly.
    """
    @abstractmethod
    async def analyze(self, incident: Incident) -> ReasoningResult:
        pass


class DeterministicDemoReasoner(ReasoningProvider):
    """
    100% reliable, zero-latency, explainable AI reasoning provider.
    Computes cause chains, confidence scores, evidence, and ranked recovery options.
    """
    async def analyze(self, incident: Incident) -> ReasoningResult:
        # Dynamic customization based on incident type and context
        wh_id = incident.warehouse_id
        capacity = incident.context.warehouse_capacity_percent
        cold_chain_count = incident.context.cold_storage_parcels
        
        # 1. Root Cause Analysis
        if "Scanner" in incident.incident_type:
            rca = RootCauseAnalysis(
                cause_chain=[
                    "Zebra ZT411 Industrial Scanner Optical Failure",
                    "Voltage Dip Detected on Dock Sub-Panel B (180V vs 230V)",
                    "UPS Battery Cell Degradation (Overdue for Q3 Maintenance)",
                    "Firmware Auto-Shutdown to Prevent Memory Corruption",
                ],
                probable_root_cause="UPS Battery Backup Failure causing unhandled brownout on Bay B",
                confidence_percent=87.4,
                supporting_evidence=[
                    f"Dock sub-panel voltage dropped below 180V at {incident.detected_at.strftime('%H:%M:%SZ')}",
                    "Dwell time for outbound packages increased from 1.8 min to 18.4 min",
                    f"Storage capacity surged to {capacity}% due to inbound staging bottleneck",
                    f"{cold_chain_count} temperature-sensitive parcels queued without thermal scan validation",
                ],
                what_happened=f"Optical scanner at {wh_id} dropped offline after a brownout triggered an unhandled UPS failover.",
                expected_consequences=f"Terminal gridlock at {wh_id} within 25 minutes; 18 trucks delayed; potential INR 4.2L SLA penalty.",
            )

            recovery_plan = [
                RecoveryOption(
                    option_id="OPTION_A",
                    action_type="ACTIVATE_BACKUP_SCANNER",
                    action_title="Activate Redundant Scanner Bay B & Clear Buffer",
                    description="Switch outbound conveyor scanning to Bay B optical line and route manual Zebra scanners to dock 2.",
                    eta_mins=6,
                    cost_estimate_inr=1500.0,
                    risk_level="Low",
                    expected_benefit="Restores 100% scanning throughput in under 6 minutes. Avoids INR 3.8L SLA breach fines.",
                    is_recommended=True,
                ),
                RecoveryOption(
                    option_id="OPTION_B",
                    action_type="SHIFT_OPERATIONS_DOCK4",
                    action_title="Shift Outbound Loading to Secondary Dock 4",
                    description="Divert oncoming haulers T-312 and T-102 to Dock 4 manual staging area.",
                    eta_mins=18,
                    cost_estimate_inr=4200.0,
                    risk_level="Medium",
                    expected_benefit="Partial recovery of 60% capacity. Requires temporary forklift redeployment.",
                    is_recommended=False,
                ),
                RecoveryOption(
                    option_id="OPTION_C",
                    action_type="DIVERT_TRUCKS_TO_JAIPUR",
                    action_title="Divert Inbound Trucks to Jaipur Gateway (JAI-W01)",
                    description="Issue dynamic route changes to 8 in-transit trucks on NH-48 to bypass Delhi W12.",
                    eta_mins=45,
                    cost_estimate_inr=18500.0,
                    risk_level="High",
                    expected_benefit="Prevents yard congestion but incurs 90 km detour fuel overhead per truck.",
                    is_recommended=False,
                ),
            ]
        else:
            # Fallback anomaly reasoning
            rca = RootCauseAnalysis(
                cause_chain=[
                    f"Operational Anomaly detected on {wh_id}",
                    "Queue depth exceeded normal P99 thresholds",
                    "Throughput degradation detected across active manifests",
                ],
                probable_root_cause="Operational Bottleneck / System Anomaly",
                confidence_percent=82.0,
                supporting_evidence=[
                    f"Warehouse capacity at {capacity}%",
                    f"Incident active for {incident.duration_mins} minutes",
                ],
                what_happened=f"Incident {incident.incident_id} detected at {wh_id}.",
                expected_consequences="Downstream delivery delays across active corridors.",
            )
            recovery_plan = [
                RecoveryOption(
                    option_id="OPTION_A",
                    action_type="RESOLVE_INCIDENT",
                    action_title="Acknowledge and Apply Mitigating SOP",
                    description="Standard operational dispatch reset and resource re-balancing.",
                    eta_mins=10,
                    cost_estimate_inr=2000.0,
                    risk_level="Low",
                    expected_benefit="Restores baseline operational throughput.",
                    is_recommended=True,
                )
            ]

        return ReasoningResult(
            incident_id=incident.incident_id,
            warehouse_id=wh_id,
            root_cause_analysis=rca,
            recovery_plan=recovery_plan,
            reasoning_mode="DETERMINISTIC_EXPLAINABLE",
        )
