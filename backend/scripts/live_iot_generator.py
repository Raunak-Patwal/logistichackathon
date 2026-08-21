import asyncio
import random
import uuid
import time
import httpx
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("IOT_SIMULATOR")

API_BASE = "http://localhost:8000/api/v1"
EVENTS_URL = f"{API_BASE}/events"

# Indian Super-Hub coordinates & corridors
FLEET_TRUCKS = [
    {
        "id": "T-102",
        "name": "Ashok Leyland 4220 Heavy Commercial Hauler",
        "origin": "W12 (Delhi Okhla)",
        "destination": "W04 (Mumbai Bhiwandi)",
        "route_id": "ROUTE-DEL-BOM",
        "distance_km": 1420.0,
        "payload_kg": 18400.0,
        "progress": 0.68,
        "speed_kmh": 74.5,
        "fuel_percent": 76,
    },
    {
        "id": "T-184",
        "name": "BharatBenz 2823C Express Multi-Axle",
        "origin": "W04 (Mumbai Bhiwandi)",
        "destination": "W08 (Bengaluru Peenya)",
        "route_id": "ROUTE-BOM-BLR",
        "distance_km": 980.0,
        "payload_kg": 15200.0,
        "progress": 0.45,
        "speed_kmh": 68.2,
        "fuel_percent": 68,
    },
    {
        "id": "T-205",
        "name": "Tata Prima 4928.S Long-Range Linehaul",
        "origin": "W12 (Delhi Okhla)",
        "destination": "W19 (Kolkata Dankuni)",
        "route_id": "ROUTE-DEL-CCU",
        "distance_km": 1530.0,
        "payload_kg": 23400.0,
        "progress": 0.82,
        "speed_kmh": 81.0,
        "fuel_percent": 48,
    },
    {
        "id": "T-312",
        "name": "Eicher Pro 6035 Modular Freight Hauler",
        "origin": "W12 (Delhi Okhla)",
        "destination": "W04 (Mumbai Bhiwandi)",
        "route_id": "ROUTE-DEL-BOM",
        "distance_km": 1420.0,
        "payload_kg": 14200.0,
        "progress": 0.55,
        "speed_kmh": 72.0,
        "fuel_percent": 71,
    },
    {
        "id": "T-501",
        "name": "Volvo FH16 Coastal Super-Carrier",
        "origin": "W22 (Chennai Sriperumbudur)",
        "destination": "W19 (Kolkata Dankuni)",
        "route_id": "ROUTE-MAA-CCU",
        "distance_km": 1680.0,
        "payload_kg": 26800.0,
        "progress": 0.74,
        "speed_kmh": 70.5,
        "fuel_percent": 59,
    },
    {
        "id": "T-708",
        "name": "Mahindra Blazo X 35 Express Hauler",
        "origin": "W09 (Hyderabad Shamshabad)",
        "destination": "W08 (Bengaluru Peenya)",
        "route_id": "ROUTE-HYD-BLR",
        "distance_km": 575.0,
        "payload_kg": 16400.0,
        "progress": 0.38,
        "speed_kmh": 76.0,
        "fuel_percent": 82,
    },
]

HUBS = ["W12", "W04", "W08", "W19", "W22", "W09", "W03", "W06"]
DESTINATIONS = [
    "Whitefield Tech Zone, Bengaluru (PIN: 560066)",
    "Bandra Kurla Complex (BKC), Mumbai (PIN: 400051)",
    "Cyber City Tower C, Gurugram (PIN: 122002)",
    "Salt Lake Sector V, Kolkata (PIN: 700091)",
    "Hitec City Phase 2, Hyderabad (PIN: 500081)",
    "Sanand GIDC Industrial Park, Ahmedabad (PIN: 382170)",
    "Chakan Auto Cluster, Pune (PIN: 410501)",
    "Sriperumbudur Electronics SEZ, Chennai (PIN: 602105)",
]


async def emit_gps_telemetry(client: httpx.AsyncClient, truck: dict):
    """Simulates realistic Queclink GV300 GPS hardware telematics."""
    # Increment progress along highway corridor
    truck["progress"] += random.uniform(0.01, 0.025)
    if truck["progress"] >= 1.0:
        truck["progress"] = 0.05
        truck["fuel_percent"] = 98

    # Slight speed variation & fuel decay
    truck["speed_kmh"] = round(max(40.0, min(88.0, truck["speed_kmh"] + random.uniform(-3.0, 3.0))), 1)
    truck["fuel_percent"] = max(15, truck["fuel_percent"] - 1 if random.random() < 0.2 else truck["fuel_percent"])

    remaining_km = round(truck["distance_km"] * (1.0 - truck["progress"]), 1)

    payload = {
        "event_type": "TRUCK_LOCATION_PING",
        "entity_type": "TRUCK",
        "entity_id": truck["id"],
        "source": f"QUECLINK_GPS_{truck['id']}",
        "idempotency_key": str(uuid.uuid4()),
        "payload": {
            "truck_id": truck["id"],
            "truck_name": truck["name"],
            "route_id": truck["route_id"],
            "progress": round(truck["progress"], 3),
            "speed_kmh": truck["speed_kmh"],
            "fuel_level_percent": truck["fuel_percent"],
            "remaining_distance_km": remaining_km,
            "cargo_load_kg": truck["payload_kg"],
            "timestamp": time.time(),
        },
    }

    try:
        res = await client.post(EVENTS_URL, json=payload, timeout=3.0)
        logger.info(
            f"📡 [GPS PING] {truck['id']} ({truck['name']}) -> "
            f"Progress: {truck['progress']*100:.1f}% | Speed: {truck['speed_kmh']} km/h | Status: {res.status_code}"
        )
    except Exception as e:
        logger.warning(f"Failed to transmit GPS ping for {truck['id']}: {e}")


async def emit_warehouse_scan_event(client: httpx.AsyncClient):
    """Simulates real-time warehouse optical conveyor scanner events."""
    parcel_id = f"P-{random.randint(10000, 99999)}"
    hub = random.choice(HUBS)
    dest = random.choice(DESTINATIONS)
    weight = round(random.uniform(1.5, 25.0), 2)
    is_cold = random.random() < 0.25

    # 1. PARCEL_CREATED
    payload = {
        "event_type": "PARCEL_CREATED",
        "entity_type": "PARCEL",
        "entity_id": parcel_id,
        "source": f"ZEBRA_SCANNER_{hub}_BAY1",
        "idempotency_key": str(uuid.uuid4()),
        "payload": {
            "weight": weight,
            "destination": dest,
            "warehouse_id": hub,
            "is_cold_chain": is_cold,
            "priority": "CRITICAL_MEDICAL" if is_cold else "STANDARD",
        },
    }

    try:
        res = await client.post(EVENTS_URL, json=payload, timeout=3.0)
        logger.info(f"📦 [SCANNER INGEST] Created Parcel {parcel_id} at {hub} ({weight}kg, Cold-Chain={is_cold}) -> {res.status_code}")
    except Exception as e:
        logger.warning(f"Failed to ingest scanner event: {e}")


async def run_live_iot_stream(duration_seconds: int = 0):
    """
    Continuous IoT telemetry streaming loop.
    duration_seconds: 0 for indefinite continuous run.
    """
    logger.info("=================================================================")
    logger.info("🚀 STARTING REAL-TIME IoT FLEET & SCANNER TELEMETRY STREAMER")
    logger.info(f"Target Gateway: {EVENTS_URL}")
    logger.info("Tracking 4 Heavy Transports (Tata, Ashok Leyland, BharatBenz, Volvo)")
    logger.info("=================================================================")

    start_time = time.time()
    async with httpx.AsyncClient() as client:
        step = 0
        while True:
            step += 1

            # 1. Emit GPS telemetry for all trucks
            for truck in FLEET_TRUCKS:
                await emit_gps_telemetry(client, truck)
                await asyncio.sleep(0.15)

            # 2. Every 3 steps, emit a new warehouse parcel scan
            if step % 3 == 0:
                await emit_warehouse_scan_event(client)

            # 3. Check duration limit if specified
            if duration_seconds > 0 and (time.time() - start_time) >= duration_seconds:
                logger.info(f"Completed streaming for {duration_seconds} seconds.")
                break

            # Sleep before next telemetry tick
            await asyncio.sleep(random.uniform(1.2, 2.0))


if __name__ == "__main__":
    import sys
    duration = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    try:
        asyncio.run(run_live_iot_stream(duration_seconds=duration))
    except KeyboardInterrupt:
        logger.info("IoT Telemetry stream stopped by operator.")
