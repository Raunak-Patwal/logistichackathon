import pytest
from src.domain.event.value_objects import EventMetadata
from src.domain.parcel.aggregate import Parcel, InvalidStateTransitionError
from src.domain.parcel.enums import ParcelState

def test_parcel_creation_success():
    parcel = Parcel(parcel_id="PKG-1001")
    metadata = EventMetadata()
    
    parcel.create(metadata=metadata, weight=2.5, destination="Delhi W12")
    
    assert parcel.state == ParcelState.CREATED
    assert parcel.version == 1
    assert len(parcel.pending_events) == 1
    assert parcel.pending_events[0].payload["weight"] == 2.5

def test_parcel_packing_success():
    parcel = Parcel(parcel_id="PKG-1002")
    metadata = EventMetadata()
    
    # 1. Create first
    parcel.create(metadata=metadata, weight=1.0, destination="Mumbai W04")
    # 2. Then Pack
    parcel.pack(metadata=metadata, packer_id="EMP-99")
    
    assert parcel.state == ParcelState.PACKED
    assert parcel.version == 2
    assert len(parcel.pending_events) == 2
    assert parcel.pending_events[1].payload["packer_id"] == "EMP-99"

def test_parcel_invalid_state_transition_packing_uncreated_parcel():
    parcel = Parcel(parcel_id="PKG-1003")
    metadata = EventMetadata()
    
    # Trying to pack without creating it first should raise an error
    with pytest.raises(InvalidStateTransitionError) as exc_info:
        parcel.pack(metadata=metadata, packer_id="EMP-99")
    
    assert "Cannot pack parcel" in str(exc_info.value)
    assert parcel.state is None # State unchanged
    assert len(parcel.pending_events) == 0

def test_parcel_cannot_be_created_twice():
    parcel = Parcel(parcel_id="PKG-1004")
    metadata = EventMetadata()
    
    parcel.create(metadata=metadata, weight=2.5, destination="Delhi W12")
    
    with pytest.raises(InvalidStateTransitionError):
        # Trying to create again
        parcel.create(metadata=metadata, weight=5.0, destination="Jaipur W01")

def test_parcel_full_lifecycle_happy_path():
    """Test the complete flow from Creation to Delivery"""
    parcel = Parcel(parcel_id="PKG-9999")
    metadata = EventMetadata()
    
    # 1. Create
    parcel.create(metadata=metadata, weight=2.0, destination="Mumbai")
    assert parcel.state == ParcelState.CREATED
    
    # 2. Pack
    parcel.pack(metadata=metadata, packer_id="EMP-01")
    assert parcel.state == ParcelState.PACKED
    
    # 3. Load
    parcel.load(metadata=metadata, truck_id="TRK-404")
    assert parcel.state == ParcelState.LOADED
    
    # 4. Dispatch
    parcel.dispatch(metadata=metadata)
    assert parcel.state == ParcelState.DISPATCHED
    
    # 5. Deliver
    parcel.deliver(metadata=metadata, proof_of_delivery="SIGNATURE_XYZ")
    assert parcel.state == ParcelState.DELIVERED
    
    # Verify events
    assert parcel.version == 5
    assert len(parcel.pending_events) == 5
    assert parcel.pending_events[-1].payload["proof_of_delivery"] == "SIGNATURE_XYZ"


def test_parcel_invalid_transition_load_before_pack():
    """A Parcel CANNOT be loaded if it hasn't been packed yet."""
    parcel = Parcel(parcel_id="PKG-8888")
    metadata = EventMetadata()
    
    # Create the parcel
    parcel.create(metadata=metadata, weight=1.5, destination="Delhi")
    
    # Try to load it directly bypassing PACKED state
    with pytest.raises(InvalidStateTransitionError) as exc_info:
        parcel.load(metadata=metadata, truck_id="TRK-101")
        
    assert "It must be PACKED first" in str(exc_info.value)
    assert parcel.state == ParcelState.CREATED # State should not have changed


def test_parcel_invalid_transition_deliver_before_dispatch():
    """A Parcel CANNOT be delivered directly from the warehouse (LOADED state)."""
    parcel = Parcel(parcel_id="PKG-7777")
    metadata = EventMetadata()
    
    parcel.create(metadata=metadata, weight=1.5, destination="Delhi")
    parcel.pack(metadata=metadata, packer_id="EMP-01")
    parcel.load(metadata=metadata, truck_id="TRK-101")
    
    # Currently LOADED. Try to deliver directly without DISPATCHING
    with pytest.raises(InvalidStateTransitionError) as exc_info:
        parcel.deliver(metadata=metadata, proof_of_delivery="FAKE_SIG")
        
    assert "It must be DISPATCHED first" in str(exc_info.value)
    assert parcel.state == ParcelState.LOADED # Must remain LOADED


def test_parcel_reconstruction_from_events():
    """Verify that pure event replay accurately reconstructs the exact state without DB."""
    parcel = Parcel(parcel_id="PKG-REPLAY-1")
    metadata = EventMetadata()
    parcel.create(metadata=metadata, weight=4.8, destination="Bengaluru")
    parcel.pack(metadata=metadata, packer_id="OPR-12")
    parcel.load(metadata=metadata, truck_id="TRK-184")

    # Capture the events
    events = list(parcel.pending_events)
    assert len(events) == 3

    # Reconstruct from pure events
    reconstructed = Parcel.from_events(events)
    assert reconstructed.id == "PKG-REPLAY-1"
    assert reconstructed.state == ParcelState.LOADED
    assert reconstructed.version == 3
    assert reconstructed.weight_kg == 4.8
    assert reconstructed.destination == "Bengaluru"
    assert reconstructed.current_truck_id == "TRK-184"
    assert reconstructed.packer_id == "OPR-12"