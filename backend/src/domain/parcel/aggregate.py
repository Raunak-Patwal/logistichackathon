from typing import List, Optional, Any, Dict
from src.domain.event.value_objects import EventMetadata, DomainEvent
from src.domain.parcel.enums import ParcelState
from src.domain.parcel.events import (
    ParcelCreatedEvent,
    ParcelPackedEvent,
    ParcelLoadedEvent,
    ParcelDispatchedEvent,
    ParcelDeliveredEvent,
)


class InvalidStateTransitionError(Exception):
    """Raised when an illegal finite state machine transition is attempted."""
    pass


class Parcel:
    def __init__(self, parcel_id: str):
        self.id = parcel_id
        self.state: Optional[ParcelState] = None
        self.version: int = 0
        self.weight_kg: float = 0.0
        self.destination: str = "UNKNOWN"
        self.origin_warehouse_id: str = "UNKNOWN"
        self.current_warehouse_id: Optional[str] = None
        self.current_truck_id: Optional[str] = None
        self.packer_id: Optional[str] = None
        self.proof_of_delivery: Optional[str] = None
        self.pending_events: List[DomainEvent] = []

    def _apply(self, event: DomainEvent) -> None:
        """Pure State Machine transition logic."""
        if isinstance(event, ParcelCreatedEvent):
            self.state = ParcelState.CREATED
            self.weight_kg = float(event.payload.get("weight", event.payload.get("weight_kg", 0.0)))
            self.destination = event.payload.get("destination", "UNKNOWN")
            self.origin_warehouse_id = event.payload.get("warehouse_id", event.payload.get("origin_warehouse_id", "W12"))
            self.current_warehouse_id = self.origin_warehouse_id
        elif isinstance(event, ParcelPackedEvent):
            self.state = ParcelState.PACKED
            self.packer_id = event.payload.get("packer_id", "SYSTEM")
            if "warehouse_id" in event.payload:
                self.current_warehouse_id = event.payload["warehouse_id"]
        elif isinstance(event, ParcelLoadedEvent):
            self.state = ParcelState.LOADED
            self.current_truck_id = event.payload.get("truck_id")
        elif isinstance(event, ParcelDispatchedEvent):
            self.state = ParcelState.DISPATCHED
            self.current_warehouse_id = None
        elif isinstance(event, ParcelDeliveredEvent):
            self.state = ParcelState.DELIVERED
            self.proof_of_delivery = event.payload.get("proof_of_delivery", "CONFIRMED")
            self.current_truck_id = None

        self.version += 1

    @classmethod
    def from_events(cls, events: List[DomainEvent]) -> "Parcel":
        """
        Reconstructs the Parcel aggregate state deterministically by replaying
        an immutable sequence of domain events.
        """
        if not events:
            raise ValueError("Cannot reconstruct parcel from empty event sequence")
        
        first_event = events[0]
        parcel = cls(parcel_id=first_event.entity_id)
        for event in events:
            parcel._apply(event)
        return parcel

    def create(self, metadata: EventMetadata, weight: float, destination: str, warehouse_id: str = "W12") -> None:
        if self.state is not None:
            raise InvalidStateTransitionError(f"Parcel {self.id} is already created in state {self.state}.")
        event = ParcelCreatedEvent(
            metadata=metadata,
            entity_id=self.id,
            payload={"weight": weight, "destination": destination, "warehouse_id": warehouse_id},
        )
        self._apply(event)
        self.pending_events.append(event)

    def pack(self, metadata: EventMetadata, packer_id: str, warehouse_id: Optional[str] = None) -> None:
        if self.state != ParcelState.CREATED:
            raise InvalidStateTransitionError(
                f"Cannot pack parcel {self.id}. Current state is {self.state}, expected {ParcelState.CREATED}."
            )
        event = ParcelPackedEvent(
            metadata=metadata,
            entity_id=self.id,
            payload={"packer_id": packer_id, "warehouse_id": warehouse_id or self.current_warehouse_id or "W12"},
        )
        self._apply(event)
        self.pending_events.append(event)

    def load(self, metadata: EventMetadata, truck_id: str) -> None:
        if self.state != ParcelState.PACKED:
            raise InvalidStateTransitionError(
                f"Cannot load parcel {self.id}. It must be PACKED first. Current: {self.state}"
            )
        event = ParcelLoadedEvent(
            metadata=metadata,
            entity_id=self.id,
            payload={"truck_id": truck_id},
        )
        self._apply(event)
        self.pending_events.append(event)

    def dispatch(self, metadata: EventMetadata) -> None:
        if self.state != ParcelState.LOADED:
            raise InvalidStateTransitionError(
                f"Cannot dispatch parcel {self.id}. It must be LOADED first. Current: {self.state}"
            )
        event = ParcelDispatchedEvent(
            metadata=metadata,
            entity_id=self.id,
            payload={"truck_id": self.current_truck_id, "status": "in_transit"},
        )
        self._apply(event)
        self.pending_events.append(event)

    def deliver(self, metadata: EventMetadata, proof_of_delivery: str) -> None:
        if self.state != ParcelState.DISPATCHED:
            raise InvalidStateTransitionError(
                f"Cannot deliver parcel {self.id}. It must be DISPATCHED first. Current: {self.state}"
            )
        event = ParcelDeliveredEvent(
            metadata=metadata,
            entity_id=self.id,
            payload={"proof_of_delivery": proof_of_delivery},
        )
        self._apply(event)
        self.pending_events.append(event)

    def to_dict(self) -> Dict[str, Any]:
        state_val = self.state.value if hasattr(self.state, "value") else str(self.state) if self.state else None
        return {
            "id": self.id,
            "state": state_val,
            "version": self.version,
            "weight_kg": self.weight_kg,
            "destination": self.destination,
            "origin_warehouse_id": self.origin_warehouse_id,
            "current_warehouse_id": self.current_warehouse_id,
            "current_truck_id": self.current_truck_id,
            "packer_id": self.packer_id,
            "proof_of_delivery": self.proof_of_delivery,
        }
