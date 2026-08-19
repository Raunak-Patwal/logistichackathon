# C4 Level 1: System Context — AI Logistics Brain

The **System Context** diagram illustrates how the AI Logistics Brain fits into the broader logistics operational ecosystem.

```mermaid
C4Context
    title System Context diagram for AI Logistics Brain

    Person(dispatcher, "Logistics Dispatcher / Operator", "Monitors shipments, tracks anomalies, and views real-time network state.")
    Person(driver, "Truck Driver", "Receives dispatch instructions and triggers milestone events.")

    System(brain, "AI Logistics Brain", "Core operational intelligence platform. Ingests events, validates invariants, maintains the materialized World Model, and provides operational visibility.")

    System_Ext(wms, "Warehouse Management System (WMS)", "Emits package scanned, pallet loaded, and warehouse departure events.")
    System_Ext(telematics, "GPS / Telematics System", "Emits real-time vehicle coordinates, geofence triggers, and speed/telemetry events.")
    System_Ext(erp, "Enterprise Resource Planning (ERP)", "Emits customer orders, commercial invoices, and master shipment definitions.")
    System_Ext(simulator, "Scenario Simulator", "Replays historical or synthetic logistics stress-test event streams.")

    Rel(wms, brain, "Ingests inventory & scanning events", "HTTPS / JSON (ULEO v0.1)")
    Rel(telematics, brain, "Ingests telematics & geofence events", "HTTPS / JSON (ULEO v0.1)")
    Rel(erp, brain, "Ingests shipment master orders", "HTTPS / JSON (ULEO v0.1)")
    Rel(simulator, brain, "Feeds test scenarios", "HTTPS / JSON (ULEO v0.1)")

    Rel(dispatcher, brain, "Views real-time world model & timelines", "HTTPS / Web Dashboard")
    Rel(brain, driver, "Future phase: dispatches alerts", "Push / SMS")
```

---

## External Actors & Systems

| Actor / System | Role & Responsibility | Interaction with Logistics Brain |
|---|---|---|
| **Warehouse Management System (WMS)** | Manages bin locations, picking, packing, sorting | Sends `PARCEL_SCANNED`, `CONTAINER_PACKED` events |
| **GPS / Telematics System** | On-truck IoT devices tracking location & speed | Sends `TRUCK_LOCATION_PING`, `GEOFENCE_ENTERED` events |
| **ERP / OMS** | Commercial and order master data | Sends `ORDER_CREATED`, `SHIPMENT_MANIFESTED` events |
| **Scenario Simulator** | Synthetic generator for load testing & chaos simulation | Streams ULEO v0.1 event batches for evaluation |
| **Logistics Dispatcher** | Human operational supervisor | Queries current World Model, monitors state transitions |
