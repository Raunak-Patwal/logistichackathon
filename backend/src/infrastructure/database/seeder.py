"""
Deterministic database seeder for AI Logistics Brain.
Populates world model tables with initial canonical entities across India.
"""
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.infrastructure.database.models.warehouse import WarehouseRecord
from src.infrastructure.database.models.airport import AirportRecord
from src.infrastructure.database.models.route import RouteRecord
from src.infrastructure.database.models.truck import TruckRecord
from src.infrastructure.database.models.parcel import ParcelRecord
from src.infrastructure.database.models.driver import DriverRecord
from src.infrastructure.database.models.incident import IncidentRecord
from src.infrastructure.database.models.incident_embedding import IncidentEmbeddingRecord


async def seed_initial_data(session: AsyncSession) -> None:
    """Seeds canonical logistics entities if database is empty."""
    # Check if already seeded
    res = await session.execute(select(WarehouseRecord).limit(1))
    if res.scalar_one_or_none() is not None:
        return  # Already seeded

    # 1. Warehouses (Real Tier-1 Indian Logistics Hubs)
    warehouses = [
        WarehouseRecord(
            id="W12",
            name="Delhi Northern Super-Hub (Okhla / NH-48)",
            code="DEL-W12",
            region="North India",
            capacity_parcels=15000,
            current_parcels_count=13840,
            dock_count=28,
            active_docks_occupied=24,
            status="OPTIMAL",
            has_cold_storage=True,
            staging_parcels=["P-1021", "P-1022", "P-1023"],
            active_truck_ids=["T-102", "T-312"],
        ),
        WarehouseRecord(
            id="W04",
            name="Mumbai Western Mega-Gateway (Bhiwandi Hub)",
            code="BOM-W04",
            region="West Coast",
            capacity_parcels=18000,
            current_parcels_count=16920,
            dock_count=36,
            active_docks_occupied=32,
            status="OPTIMAL",
            has_cold_storage=True,
            staging_parcels=["P-1031", "P-1032"],
            active_truck_ids=["T-184", "T-409"],
        ),
        WarehouseRecord(
            id="W08",
            name="Bengaluru Tech Logistics Hub (Peenya)",
            code="BLR-W08",
            region="South Central",
            capacity_parcels=12000,
            current_parcels_count=9820,
            dock_count=22,
            active_docks_occupied=18,
            status="OPTIMAL",
            has_cold_storage=True,
            staging_parcels=["P-1061", "P-1062"],
            active_truck_ids=["T-620"],
        ),
        WarehouseRecord(
            id="W19",
            name="Kolkata Eastern Gateway (Dankuni Hub)",
            code="CCU-W19",
            region="East India",
            capacity_parcels=11000,
            current_parcels_count=8740,
            dock_count=20,
            active_docks_occupied=16,
            status="OPTIMAL",
            has_cold_storage=True,
            staging_parcels=["P-1081"],
            active_truck_ids=["T-205"],
        ),
        WarehouseRecord(
            id="W22",
            name="Chennai Maritime Node (Sriperumbudur)",
            code="MAA-W22",
            region="South East Coast",
            capacity_parcels=9500,
            current_parcels_count=7120,
            dock_count=18,
            active_docks_occupied=14,
            status="OPTIMAL",
            has_cold_storage=False,
            staging_parcels=[],
            active_truck_ids=["T-501"],
        ),
        WarehouseRecord(
            id="W09",
            name="Hyderabad Central Logistics Zone (Shamshabad)",
            code="HYD-W09",
            region="Deccan Central",
            capacity_parcels=10500,
            current_parcels_count=8450,
            dock_count=20,
            active_docks_occupied=15,
            status="OPTIMAL",
            has_cold_storage=True,
            staging_parcels=[],
            active_truck_ids=["T-708"],
        ),
        WarehouseRecord(
            id="W03",
            name="Ahmedabad Western Freight Node (Sanand)",
            code="AMD-W03",
            region="Gujarat Corridor",
            capacity_parcels=8500,
            current_parcels_count=6200,
            dock_count=16,
            active_docks_occupied=12,
            status="OPTIMAL",
            has_cold_storage=True,
            staging_parcels=[],
            active_truck_ids=[],
        ),
        WarehouseRecord(
            id="W06",
            name="Pune Auto & Pharma Super-Center (Chakan)",
            code="PNQ-W06",
            region="Maharashtra Industrial",
            capacity_parcels=9000,
            current_parcels_count=7300,
            dock_count=18,
            active_docks_occupied=14,
            status="OPTIMAL",
            has_cold_storage=True,
            staging_parcels=[],
            active_truck_ids=[],
        ),
    ]
    session.add_all(warehouses)

    # 2. Airports (International Air Cargo Hubs)
    airports = [
        AirportRecord(
            id="AIR-DEL",
            name="Indira Gandhi International Air Cargo (DEL)",
            iata="DEL",
            cargo_throughput_tons_day=2450.0,
            active_air_routes=28,
            status="OPERATIONAL",
            connected_warehouse_ids=["W12"],
        ),
        AirportRecord(
            id="AIR-BOM",
            name="Chhatrapati Shivaji Maharaj Air Freight Terminal (BOM)",
            iata="BOM",
            cargo_throughput_tons_day=2890.0,
            active_air_routes=34,
            status="HIGH_THROUGHPUT",
            connected_warehouse_ids=["W04", "W06"],
        ),
        AirportRecord(
            id="AIR-BLR",
            name="Kempegowda International Aero Cargo Terminal (BLR)",
            iata="BLR",
            cargo_throughput_tons_day=1750.0,
            active_air_routes=22,
            status="OPERATIONAL",
            connected_warehouse_ids=["W08"],
        ),
        AirportRecord(
            id="AIR-HYD",
            name="Rajiv Gandhi International Air Logistics (HYD)",
            iata="HYD",
            cargo_throughput_tons_day=1350.0,
            active_air_routes=18,
            status="OPERATIONAL",
            connected_warehouse_ids=["W09"],
        ),
        AirportRecord(
            id="AIR-CCU",
            name="Netaji Subhash Chandra Bose Cargo Complex (CCU)",
            iata="CCU",
            cargo_throughput_tons_day=1120.0,
            active_air_routes=16,
            status="OPERATIONAL",
            connected_warehouse_ids=["W19"],
        ),
    ]
    session.add_all(airports)

    # 3. Routes
    routes = [
        RouteRecord(
            id="ROUTE-DEL-BOM",
            name="NH-48 Golden Quadrilateral (Delhi -> Mumbai)",
            origin_id="W12",
            destination_id="W04",
            distance_km=1410.0,
            estimated_time_mins=1440,
            congestion_factor=1.15,
            risk_level="LOW",
            active_truck_ids=["T-102"],
        ),
        RouteRecord(
            id="ROUTE-BOM-BLR",
            name="NH-48 Western Expressway (Mumbai -> Bengaluru)",
            origin_id="W04",
            destination_id="W08",
            distance_km=985.0,
            estimated_time_mins=1020,
            congestion_factor=1.35,
            risk_level="MEDIUM",
            active_truck_ids=["T-184"],
        ),
        RouteRecord(
            id="ROUTE-DEL-CCU",
            name="Grand Trunk Expressway (Delhi -> Kolkata)",
            origin_id="W12",
            destination_id="W19",
            distance_km=1490.0,
            estimated_time_mins=1560,
            congestion_factor=1.05,
            risk_level="LOW",
            active_truck_ids=["T-205"],
        ),
    ]
    session.add_all(routes)

    # 4. Drivers
    drivers = [
        DriverRecord(id="DRV-101", name="Rajesh Kumar", license_number="DL-042019-8812", assigned_truck_id="T-102", shift_hours=4.2, status="DRIVING", rating=4.9),
        DriverRecord(id="DRV-102", name="Vikram Singh", license_number="MH-122018-4491", assigned_truck_id="T-184", shift_hours=6.1, status="DRIVING", rating=4.8),
        DriverRecord(id="DRV-103", name="Amit Sharma", license_number="UP-162020-3329", assigned_truck_id="T-205", shift_hours=7.5, status="DRIVING", rating=4.7),
        DriverRecord(id="DRV-104", name="Suresh Patil", license_number="DL-012021-9941", assigned_truck_id="T-312", shift_hours=1.5, status="ON_DUTY", rating=4.9),
        DriverRecord(id="DRV-105", name="Deepa Patel", license_number="GJ-062017-7712", assigned_truck_id="T-409", shift_hours=8.0, status="ON_DUTY", rating=4.95),
    ]
    session.add_all(drivers)

    # 5. Trucks
    trucks = [
        TruckRecord(
            id="T-102",
            name="Ashok Leyland 4018 Heavy Hauler",
            status="IN_TRANSIT",
            license_plate="DL-01-AX-9921",
            current_route_id="ROUTE-DEL-BOM",
            origin_id="W12",
            destination_id="W04",
            progress=0.65,
            speed_kmh=74.0,
            capacity_kg=24000.0,
            current_load_kg=18200.0,
            parcel_ids=["P-1001", "P-1002"],
            driver_id="DRV-101",
            fuel_level_percent=78.0,
        ),
        TruckRecord(
            id="T-184",
            name="BharatBenz 2823C Express Freighter",
            status="IN_TRANSIT",
            license_plate="MH-04-CZ-1029",
            current_route_id="ROUTE-BOM-BLR",
            origin_id="W04",
            destination_id="W08",
            progress=0.32,
            speed_kmh=68.0,
            capacity_kg=18000.0,
            current_load_kg=15400.0,
            parcel_ids=["P-10291", "P-10292"],
            driver_id="DRV-102",
            fuel_level_percent=64.0,
        ),
        TruckRecord(
            id="T-205",
            name="Tata Prima 4928.S Long-Range Cargo",
            status="IN_TRANSIT",
            license_plate="UP-32-BN-8104",
            current_route_id="ROUTE-DEL-CCU",
            origin_id="W12",
            destination_id="W19",
            progress=0.78,
            speed_kmh=82.0,
            capacity_kg=28000.0,
            current_load_kg=22100.0,
            parcel_ids=[],
            driver_id="DRV-103",
            fuel_level_percent=51.0,
        ),
        TruckRecord(
            id="T-312",
            name="Eicher Pro 6035 Modular Hauler",
            status="LOADING",
            license_plate="DL-04-EQ-4412",
            current_route_id="ROUTE-DEL-BOM",
            origin_id="W12",
            destination_id="W04",
            progress=0.0,
            speed_kmh=0.0,
            capacity_kg=20000.0,
            current_load_kg=8400.0,
            parcel_ids=["P-1021"],
            driver_id="DRV-104",
            fuel_level_percent=94.0,
        ),
    ]
    session.add_all(trucks)

    # 6. Parcels
    parcels = [
        ParcelRecord(
            id="P-10291",
            state="LOADED",
            version=3,
            weight=4.8,
            destination="Bengaluru Tech Park (BLR)",
            packer_id="OPR-491",
            truck_id="T-184",
        ),
        ParcelRecord(
            id="P-10292",
            state="LOADED",
            version=3,
            weight=12.4,
            destination="Bengaluru Distribution Hub",
            packer_id="OPR-491",
            truck_id="T-184",
        ),
        ParcelRecord(
            id="P-1001",
            state="DISPATCHED",
            version=4,
            weight=8.5,
            destination="Mumbai Port Logistics",
            packer_id="OPR-DEL-12",
            truck_id="T-102",
        ),
        ParcelRecord(
            id="P-1021",
            state="PACKED",
            version=2,
            weight=2.1,
            destination="Mumbai South Hub",
            packer_id="PCK-881",
        ),
        ParcelRecord(
            id="P-1022",
            state="CREATED",
            version=1,
            weight=5.4,
            destination="Mumbai Commercial Zone",
        ),
    ]
    session.add_all(parcels)

    # 7. Incidents
    incidents = [
        IncidentRecord(
            id="INC-8921",
            warehouse_id="W12",
            incident_type="Scanner Hardware Failure",
            severity="HIGH",
            status="OPEN",
            duration_mins=32,
            affected_parcels=540,
            affected_trucks=18,
            context_data={
                "warehouse_capacity_percent": 95.0,
                "cold_storage_parcels": 18,
                "medicine_shipments": 12,
                "next_truck_eta_mins": 14,
                "nearest_backup_scanner": "Scanner Bay B (Available)",
                "weather": "Normal / Clear 28°C",
            },
        ),
        IncidentRecord(
            id="INC-7801",
            warehouse_id="W04",
            incident_type="Optical Scanner Malfunction",
            severity="HIGH",
            status="RESOLVED",
            duration_mins=18,
            affected_parcels=310,
            affected_trucks=12,
            context_data={
                "warehouse_capacity_percent": 88.0,
                "cold_storage_parcels": 8,
                "medicine_shipments": 5,
                "nearest_backup_scanner": "Scanner Bay B",
            },
        ),
        IncidentRecord(
            id="INC-6520",
            warehouse_id="W08",
            incident_type="Inbound Dock Staging Congestion",
            severity="MEDIUM",
            status="RESOLVED",
            duration_mins=25,
            affected_parcels=420,
            affected_trucks=15,
            context_data={
                "warehouse_capacity_percent": 92.0,
                "dock_congestion_percent": 90.0,
            },
        ),
    ]
    session.add_all(incidents)

    # 8. PgVector RAG Historical Precedence Memories
    dummy_emb_1 = [((i + 42) % 100) / 100.0 for i in range(768)]
    dummy_emb_2 = [((i + 88) % 100) / 100.0 for i in range(768)]
    embeddings = [
        IncidentEmbeddingRecord(
            incident_id="INC-7801",
            incident_summary=(
                "Incident Context: Optical Scanner failure on Bay 1 at Mumbai Western Mega-Gateway (BOM-W04). "
                "Storage was at 88%, holding 8 cold-chain medical packages. "
                "Resolution: Activated Redundant Scanner Bay B and reassigned 4 handheld Zebra scanners. "
                "Throughput restored in 6 minutes; zero SLA penalties incurred."
            ),
            embedding=dummy_emb_1,
        ),
        IncidentEmbeddingRecord(
            incident_id="INC-6520",
            incident_summary=(
                "Incident Context: Inbound dock congestion and truck staging backup at Bengaluru W08. "
                "Resolution: Diverted oncoming haulers to Secondary Dock 4 and dynamically rerouted 6 trucks. "
                "Queue reduced within 18 minutes; prevented yard lockup."
            ),
            embedding=dummy_emb_2,
        ),
    ]
    session.add_all(embeddings)

    await session.commit()

