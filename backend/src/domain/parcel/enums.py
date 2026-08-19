from enum import StrEnum

class ParcelState(StrEnum):
    CREATED = "CREATED"
    PACKED = "PACKED"
    LOADED = "LOADED"
    DISPATCHED = "DISPATCHED"
    DELIVERED = "DELIVERED"