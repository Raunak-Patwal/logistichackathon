import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Building2,
  Plane,
  Truck,
  AlertTriangle,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Navigation,
  Compass,
  Radio,
  Eye,
  Crosshair,
  Sparkles,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { useWorldModelStore } from '../../state/useWorldModelStore';
import { useUIStore } from '../../state/useUIStore';

// Geographical mapping: Convert 3D operational coordinates to 2D tactical projection coordinates
// 3D coordinates in store:
// Delhi W12: [-8, 0, -5], BOM W04: [-11, 0, 4], BLR W08: [-4, 0, 11], MAA W22: [3, 0, 12], CCU W19: [10, 0, -2]
// We project these onto a 1200 x 800 SVG tactical canvas representing India's Logistics Grid
const map3DTo2D = (x: number, z: number): [number, number] => {
  // Center: [0, 0] in 3D maps to [600, 420]
  // Scaling factors calibrated to Indian geographic proportions
  const px = 600 + x * 32;
  const pz = 420 + z * 28;
  return [px, pz];
};

// Hub coordinates in 2D space
const HUB_2D_COORDS: Record<string, { x: number; y: number; lat: string; lon: string }> = {
  W12: { x: 380, y: 190, lat: '28.61° N', lon: '77.20° E' }, // Delhi
  W04: { x: 260, y: 460, lat: '19.07° N', lon: '72.87° E' }, // Mumbai
  W08: { x: 440, y: 660, lat: '12.97° N', lon: '77.59° E' }, // Bengaluru
  W22: { x: 620, y: 680, lat: '13.08° N', lon: '80.27° E' }, // Chennai
  W19: { x: 860, y: 350, lat: '22.57° N', lon: '88.36° E' }, // Kolkata
  'AIR-DEL': { x: 370, y: 140, lat: '28.55° N', lon: '77.10° E' },
  'AIR-BOM': { x: 210, y: 440, lat: '19.08° N', lon: '72.86° E' },
  'AIR-BLR': { x: 440, y: 720, lat: '13.19° N', lon: '77.70° E' },
  'AIR-CCU': { x: 920, y: 320, lat: '22.65° N', lon: '88.44° E' },
  'AIR-MAA': { x: 680, y: 720, lat: '12.99° N', lon: '80.17° E' },
};

// SVG Path for high-tech India Subcontinent Land Contour
const INDIA_CONTOUR_PATH = `
  M 320,100
  C 350,60 420,60 450,90
  L 520,110
  L 600,160
  L 720,200
  L 880,240
  L 980,270
  L 1000,340
  L 940,380
  L 880,410
  L 780,480
  L 680,620
  L 640,730
  L 560,780
  L 500,810
  L 450,770
  L 380,690
  L 300,580
  L 230,490
  L 190,410
  L 180,330
  L 220,240
  L 260,180
  Z
`;

export const World2DMap: React.FC = () => {
  const warehouses = useWorldModelStore((s) => s.warehouses);
  const airports = useWorldModelStore((s) => s.airports);
  const routes = useWorldModelStore((s) => s.routes);
  const trucks = useWorldModelStore((s) => s.trucks);
  const incidents = useWorldModelStore((s) => s.incidents);
  const parcels = useWorldModelStore((s) => s.parcels);
  const telemetry = useWorldModelStore((s) => s.telemetry);

  const selectedType = useUIStore((s) => s.selectedEntityType);
  const selectedId = useUIStore((s) => s.selectedEntityId);
  const highlightedEntityIds = useUIStore((s) => s.highlightedEntityIds);
  const highlightedRouteId = useUIStore((s) => s.highlightedRouteId);
  const selectEntity = useUIStore((s) => s.selectEntity);
  const clearSelection = useUIStore((s) => s.clearSelection);

  // Pan & Zoom state
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [mouseCoord, setMouseCoord] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Layer filters
  const [showHubs, setShowHubs] = useState(true);
  const [showAirports, setShowAirports] = useState(true);
  const [showTrucks, setShowTrucks] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showFlowAnimation, setShowFlowAnimation] = useState(true);

  // Hover state
  const [hoveredEntity, setHoveredEntity] = useState<{
    type: string;
    id: string;
    name: string;
    details: string;
    x: number;
    y: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.6), 3.2));
  };

  // Mouse drag pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMouseCoord({
        x: Math.round(e.clientX - rect.left),
        y: Math.round(e.clientY - rect.top),
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Reset zoom & pan to default
  const handleResetView = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  const cameraMode = useUIStore((s) => s.cameraMode);
  const cameraNonce = useUIStore((s) => s.cameraNonce);

  // Center on entity when selected
  useEffect(() => {
    if (!selectedId) return;
    const hubCoord = HUB_2D_COORDS[selectedId];
    if (hubCoord) {
      setPan({
        x: (600 - hubCoord.x) * zoom,
        y: (400 - hubCoord.y) * zoom,
      });
    }
  }, [selectedId, zoom]);

  // Reset to overview when Overview button is clicked
  useEffect(() => {
    if (cameraMode === 'NETWORK_OVERVIEW') {
      setPan({ x: 0, y: 0 });
      setZoom(1);
    }
  }, [cameraNonce, cameraMode]);

  // Route 2D Splines calculated from origin & destination hub coordinates
  const routePaths = useMemo(() => {
    return routes.map((route) => {
      const originCoord = HUB_2D_COORDS[route.origin_id] || map3DTo2D(route.path_points[0][0], route.path_points[0][2]);
      const destCoord =
        HUB_2D_COORDS[route.destination_id] ||
        map3DTo2D(
          route.path_points[route.path_points.length - 1][0],
          route.path_points[route.path_points.length - 1][2]
        );

      let d = '';
      if (route.path_points && route.path_points.length > 2) {
        // Multi-point spline
        const pts = route.path_points.map((p) => map3DTo2D(p[0], p[2]));
        d = `M ${pts[0][0]},${pts[0][1]}`;
        for (let i = 1; i < pts.length; i++) {
          const xc = (pts[i - 1][0] + pts[i][0]) / 2;
          const yc = (pts[i - 1][1] + pts[i][1]) / 2;
          d += ` Q ${pts[i - 1][0]},${pts[i - 1][1]} ${xc},${yc}`;
        }
        d += ` L ${pts[pts.length - 1][0]},${pts[pts.length - 1][1]}`;
      } else {
        // Curve between origin and destination
        const midX = (originCoord.x + destCoord.x) / 2 - (destCoord.y - originCoord.y) * 0.15;
        const midY = (originCoord.y + destCoord.y) / 2 + (destCoord.x - originCoord.x) * 0.15;
        d = `M ${originCoord.x},${originCoord.y} Q ${midX},${midY} ${destCoord.x},${destCoord.y}`;
      }

      const isHighlighted = highlightedRouteId === route.id;
      const isCongested = route.congestion_factor > 1.3;
      const isAir = route.id.includes('AIR');

      return {
        ...route,
        d,
        isHighlighted,
        isCongested,
        isAir,
        originCoord,
        destCoord,
      };
    });
  }, [routes, highlightedRouteId]);

  // Dynamic Truck 2D positions
  const truckPositions = useMemo(() => {
    return trucks.map((truck) => {
      const [tx, ty, tz] = truck.position;
      const [x, y] = map3DTo2D(tx, tz);
      const isSelected = selectedType === 'TRUCK' && selectedId === truck.id;
      const isRelated = highlightedEntityIds.includes(truck.id);

      return {
        ...truck,
        x,
        y,
        isSelected,
        isRelated,
      };
    });
  }, [trucks, selectedType, selectedId, highlightedEntityIds]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: '#040711',
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: 0,
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={(e) => {
        if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).id === 'map-background') {
          clearSelection();
          setHoveredEntity(null);
        }
      }}
    >
      {/* Left-Side Unified Tactical Layer & Map Controls HUD */}
      <div
        className="glass-card"
        style={{
          position: 'absolute',
          top: '124px',
          left: '24px',
          zIndex: 25,
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          width: '200px',
          background: 'rgba(6, 11, 24, 0.92)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(0, 240, 255, 0.28)',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.9), 0 0 20px rgba(0, 240, 255, 0.12)',
          borderRadius: '12px',
        }}
      >
        {/* Header with Live Status Dot and Zoom Level */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0, 240, 255, 0.18)', paddingBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                boxShadow: '0 0 8px #10b981',
              }}
            />
            <span className="font-mono text-xs" style={{ color: '#00f0ff', fontWeight: 700, letterSpacing: '0.04em' }}>
              2D GIS RADAR
            </span>
          </div>
          <span className="font-mono" style={{ fontSize: '0.66rem', color: '#94a3b8' }}>
            {(zoom * 100).toFixed(0)}%
          </span>
        </div>

        {/* Tactical Layers Checklist */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#f8fafc', cursor: 'pointer' }}>
            <span>Super-Hubs ({warehouses.length})</span>
            <input type="checkbox" checked={showHubs} onChange={(e) => setShowHubs(e.target.checked)} />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#f8fafc', cursor: 'pointer' }}>
            <span>Airports ({airports.length})</span>
            <input type="checkbox" checked={showAirports} onChange={(e) => setShowAirports(e.target.checked)} />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#f8fafc', cursor: 'pointer' }}>
            <span>Fleet Trucks ({trucks.length})</span>
            <input type="checkbox" checked={showTrucks} onChange={(e) => setShowTrucks(e.target.checked)} />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#f8fafc', cursor: 'pointer' }}>
            <span>Corridors ({routes.length})</span>
            <input type="checkbox" checked={showRoutes} onChange={(e) => setShowRoutes(e.target.checked)} />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#ff3366', cursor: 'pointer' }}>
            <span>Incidents ({incidents.filter((i) => i.status !== 'RESOLVED').length})</span>
            <input type="checkbox" checked={showIncidents} onChange={(e) => setShowIncidents(e.target.checked)} />
          </label>

          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', color: '#94a3b8', cursor: 'pointer' }}>
              <span>Radar Grid</span>
              <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', color: '#94a3b8', cursor: 'pointer' }}>
              <span>Flow Pulses</span>
              <input type="checkbox" checked={showFlowAnimation} onChange={(e) => setShowFlowAnimation(e.target.checked)} />
            </label>
          </div>
        </div>

        {/* Integrated Pan & Zoom Action Buttons */}
        <div style={{ borderTop: '1px solid rgba(0, 240, 255, 0.18)', paddingTop: '8px', display: 'flex', gap: '4px' }}>
          <button
            className="cyber-btn"
            onClick={() => setZoom((z) => Math.min(z * 1.25, 3.2))}
            style={{ flex: 1, padding: '4px 6px', fontSize: '0.7rem', justifyContent: 'center', borderRadius: '4px' }}
            title="Zoom In"
          >
            <ZoomIn size={12} color="#00f0ff" />
            <span>+</span>
          </button>

          <button
            className="cyber-btn"
            onClick={() => setZoom((z) => Math.max(z * 0.8, 0.6))}
            style={{ flex: 1, padding: '4px 6px', fontSize: '0.7rem', justifyContent: 'center', borderRadius: '4px' }}
            title="Zoom Out"
          >
            <ZoomOut size={12} color="#00f0ff" />
            <span>-</span>
          </button>

          <button
            className="cyber-btn"
            onClick={handleResetView}
            style={{ flex: 1.4, padding: '4px 6px', fontSize: '0.68rem', justifyContent: 'center', borderRadius: '4px' }}
            title="Fit All Nodes"
          >
            <Maximize2 size={11} color="#00f0ff" />
            <span>FIT</span>
          </button>
        </div>
      </div>

      {/* Main Interactive SVG Canvas */}
      <svg
        id="map-background"
        width="100%"
        height="100%"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid meet"
        style={{
          width: '100%',
          height: '100%',
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '50% 50%',
          transition: isDragging ? 'none' : 'transform 0.15s ease-out',
        }}
      >
        <defs>
          {/* Radial & Linear Cyber Gradients */}
          <radialGradient id="oceanGlow" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#0a1428" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#040711" stopOpacity="1" />
          </radialGradient>

          <linearGradient id="corridorGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.4" />
          </linearGradient>

          <linearGradient id="congestedCorridor" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff3366" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.5" />
          </linearGradient>

          <linearGradient id="airCorridor" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.4" />
          </linearGradient>

          {/* Glowing Shadow Filters */}
          <filter id="glow-cyan" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="glow-danger" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Animated Flow Dash Pattern */}
          <style>
            {`
              @keyframes dashFlow {
                to {
                  stroke-dashoffset: -40;
                }
              }
              .route-flow-active {
                animation: dashFlow 1.2s linear infinite;
              }
              @keyframes pulseRing {
                0% { r: 10; opacity: 0.8; }
                100% { r: 35; opacity: 0; }
              }
              .pulse-ring-anim {
                animation: pulseRing 2.2s cubic-bezier(0.2, 0.8, 0.4, 1) infinite;
              }
              @keyframes pulseDangerRing {
                0% { r: 12; opacity: 0.9; }
                100% { r: 42; opacity: 0; }
              }
              .pulse-danger-anim {
                animation: pulseDangerRing 1.5s cubic-bezier(0.2, 0.8, 0.4, 1) infinite;
              }
            `}
          </style>
        </defs>

        {/* 1. Deep Oceanic Background & Tactical Hex Graticule */}
        <rect width="1200" height="800" fill="url(#oceanGlow)" />

        {/* 2. Tactical Lat/Long Coordinates & Grid Overlay */}
        {showGrid && (
          <g opacity="0.18">
            {/* Latitude parallels */}
            {[100, 200, 300, 400, 500, 600, 700].map((y) => (
              <g key={`lat-${y}`}>
                <line x1="50" y1={y} x2="1150" y2={y} stroke="#00f0ff" strokeWidth="0.8" strokeDasharray="4, 6" />
                <text x="60" y={y - 4} fill="#00f0ff" fontSize="9" fontFamily="JetBrains Mono, monospace">
                  {34 - Math.round(y / 28)}°00'N
                </text>
              </g>
            ))}
            {/* Longitude meridians */}
            {[150, 300, 450, 600, 750, 900, 1050].map((x) => (
              <g key={`lon-${x}`}>
                <line x1={x} y1="50" x2={x} y2="750" stroke="#00f0ff" strokeWidth="0.8" strokeDasharray="4, 6" />
                <text x={x + 4} y="770" fill="#00f0ff" fontSize="9" fontFamily="JetBrains Mono, monospace">
                  {68 + Math.round(x / 35)}°00'E
                </text>
              </g>
            ))}
          </g>
        )}

        {/* 3. India Subcontinent Land Contour with Neon Border */}
        <path
          d={INDIA_CONTOUR_PATH}
          fill="rgba(10, 24, 48, 0.35)"
          stroke="rgba(0, 240, 255, 0.3)"
          strokeWidth="1.8"
          strokeDasharray="6, 3"
          filter="url(#glow-cyan)"
        />

        {/* Regional Sector Boundaries */}
        <g stroke="rgba(0, 240, 255, 0.1)" strokeWidth="1" strokeDasharray="3, 4" fill="none">
          <circle cx="380" cy="190" r="140" /> {/* Northern Sector */}
          <circle cx="260" cy="460" r="130" /> {/* Western Sector */}
          <circle cx="530" cy="670" r="160" /> {/* Southern Sector */}
          <circle cx="860" cy="350" r="140" /> {/* Eastern Sector */}
        </g>

        {/* 4. Logistics Corridors & Highways */}
        {showRoutes && (
          <g>
            {routePaths.map((r) => {
              const isSelected = highlightedRouteId === r.id;
              const strokeColor = r.isAir
                ? '#a855f7'
                : r.isCongested
                ? '#ff3366'
                : isSelected
                ? '#00f0ff'
                : '#0284c7';

              return (
                <g
                  key={r.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => selectEntity('ROUTE' as any, r.id)}
                  onMouseEnter={() =>
                    setHoveredEntity({
                      type: 'CORRIDOR',
                      id: r.id,
                      name: r.name,
                      details: `Distance: ${r.distance_km} km • ETA: ${r.estimated_time_mins} mins • Congestion: ${r.congestion_factor}x (${r.risk_level} Risk)`,
                      x: (r.originCoord.x + r.destCoord.x) / 2,
                      y: (r.originCoord.y + r.destCoord.y) / 2,
                    })
                  }
                  onMouseLeave={() => setHoveredEntity(null)}
                >
                  {/* Outer glowing trace */}
                  <path
                    d={r.d}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={isSelected ? 6 : r.isCongested ? 4 : 3}
                    strokeOpacity={isSelected ? 0.9 : 0.45}
                    strokeDasharray={r.isAir ? '8, 6' : undefined}
                    filter={isSelected ? 'url(#glow-cyan)' : undefined}
                  />

                  {/* Flow Animation Pulses */}
                  {showFlowAnimation && (
                    <path
                      d={r.d}
                      fill="none"
                      stroke={r.isCongested ? '#f59e0b' : '#ffffff'}
                      strokeWidth={isSelected ? 3.5 : 2}
                      strokeDasharray="8, 20"
                      className="route-flow-active"
                      opacity="0.85"
                    />
                  )}

                  {/* Route Label */}
                  <text
                    x={(r.originCoord.x + r.destCoord.x) / 2}
                    y={(r.originCoord.y + r.destCoord.y) / 2 - 8}
                    fill={strokeColor}
                    fontSize="9"
                    fontFamily="JetBrains Mono, monospace"
                    fontWeight="700"
                    textAnchor="middle"
                    style={{ pointerEvents: 'none', textShadow: '0 2px 6px rgba(0,0,0,0.9)' }}
                  >
                    {r.name.split('(')[0]}
                  </text>
                </g>
              );
            })}
          </g>
        )}

        {/* 5. Intermodal Airports */}
        {showAirports && (
          <g>
            {airports.map((ap) => {
              const coord = HUB_2D_COORDS[ap.id] || map3DTo2D(ap.position[0], ap.position[2]);
              const isSelected = selectedType === 'AIRPORT' && selectedId === ap.id;
              const isRelated = highlightedEntityIds.includes(ap.id);

              return (
                <g
                  key={ap.id}
                  transform={`translate(${coord.x}, ${coord.y})`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => selectEntity('AIRPORT', ap.id, ap.position)}
                  onMouseEnter={() =>
                    setHoveredEntity({
                      type: 'AIRPORT',
                      id: ap.id,
                      name: `${ap.name} (${ap.iata})`,
                      details: `Throughput: ${ap.cargo_throughput_tons_day} tons/day • Active Flights: ${ap.active_air_routes} • Status: ${ap.status}`,
                      x: coord.x,
                      y: coord.y,
                    })
                  }
                  onMouseLeave={() => setHoveredEntity(null)}
                >
                  {/* Airport Pulse Ring */}
                  <circle cx="0" cy="0" r="18" fill="none" stroke="#a855f7" strokeWidth="1" strokeDasharray="3, 3" />
                  <circle cx="0" cy="0" r="8" fill="rgba(168, 85, 247, 0.2)" stroke="#a855f7" strokeWidth="1.5" />

                  {/* Airport Badge */}
                  <rect x="-18" y="12" width="36" height="14" rx="4" fill="rgba(6, 11, 24, 0.9)" stroke="#a855f7" strokeWidth="1" />
                  <text x="0" y="22" fill="#d8b4fe" fontSize="8" fontWeight="800" fontFamily="JetBrains Mono, monospace" textAnchor="middle">
                    ✈ {ap.iata}
                  </text>
                </g>
              );
            })}
          </g>
        )}

        {/* 6. Super-Hubs & Warehouses */}
        {showHubs && (
          <g>
            {warehouses.map((wh) => {
              const coord = HUB_2D_COORDS[wh.id] || map3DTo2D(wh.position[0], wh.position[2]);
              const isSelected = selectedType === 'WAREHOUSE' && selectedId === wh.id;
              const isRelated = highlightedEntityIds.includes(wh.id);
              const isAnomaly = wh.status !== 'OPTIMAL';
              const occupancy = Math.round((wh.current_parcels_count / wh.capacity_parcels) * 100);

              const color = isAnomaly ? '#ff3366' : isSelected ? '#00f0ff' : '#38bdf8';

              return (
                <g
                  key={wh.id}
                  transform={`translate(${coord.x}, ${coord.y})`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => selectEntity('WAREHOUSE', wh.id, wh.position)}
                  onMouseEnter={() =>
                    setHoveredEntity({
                      type: 'WAREHOUSE',
                      id: wh.id,
                      name: wh.name,
                      details: `Occupancy: ${occupancy}% (${wh.current_parcels_count} / ${wh.capacity_parcels}) • Docks: ${wh.active_docks_occupied}/${wh.dock_count} • Status: ${wh.status}`,
                      x: coord.x,
                      y: coord.y,
                    })
                  }
                  onMouseLeave={() => setHoveredEntity(null)}
                >
                  {/* Pulsing Radar Range Rings */}
                  <circle cx="0" cy="0" r="14" fill="none" stroke={color} strokeWidth="1.2" className="pulse-ring-anim" />

                  {/* Core Base Node Circle */}
                  <circle
                    cx="0"
                    cy="0"
                    r={isSelected ? 16 : 13}
                    fill="rgba(6, 11, 24, 0.95)"
                    stroke={color}
                    strokeWidth={isSelected ? 2.5 : 1.8}
                    filter="url(#glow-cyan)"
                  />

                  {/* Occupancy Arc */}
                  <circle
                    cx="0"
                    cy="0"
                    r={isSelected ? 16 : 13}
                    fill="none"
                    stroke={occupancy > 85 ? '#ff3366' : '#10b981'}
                    strokeWidth="2.5"
                    strokeDasharray={`${(occupancy / 100) * 81}, 100`}
                    strokeLinecap="round"
                    transform="rotate(-90)"
                  />

                  {/* Center Node Icon */}
                  <circle cx="0" cy="0" r="4" fill={color} />

                  {/* Hub Identity Tag Card */}
                  <g transform="translate(0, 20)">
                    <rect
                      x="-45"
                      y="0"
                      width="90"
                      height="24"
                      rx="4"
                      fill="rgba(6, 11, 24, 0.92)"
                      stroke={isSelected ? '#00f0ff' : 'rgba(0, 240, 255, 0.25)'}
                      strokeWidth="1"
                    />
                    <text x="0" y="11" fill="#f8fafc" fontSize="9" fontWeight="700" fontFamily="Space Grotesk, sans-serif" textAnchor="middle">
                      {wh.code}
                    </text>
                    <text x="0" y="20" fill={occupancy > 85 ? '#ff3366' : '#00f0ff'} fontSize="7.5" fontWeight="600" fontFamily="JetBrains Mono, monospace" textAnchor="middle">
                      {occupancy}% OCCUPIED
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        )}

        {/* 7. Active Incidents & Bottleneck Radar */}
        {showIncidents && (
          <g>
            {incidents
              .filter((i) => i.status !== 'RESOLVED')
              .map((inc) => {
                const wh = warehouses.find((w) => w.id === inc.warehouse_id);
                const coord = HUB_2D_COORDS[inc.warehouse_id] || (wh ? map3DTo2D(wh.position[0], wh.position[2]) : { x: 400, y: 300 });
                const isSelected = selectedType === 'INCIDENT' && selectedId === inc.id;

                return (
                  <g
                    key={inc.id}
                    transform={`translate(${coord.x}, ${coord.y})`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => selectEntity('INCIDENT', inc.id)}
                    onMouseEnter={() =>
                      setHoveredEntity({
                        type: 'INCIDENT',
                        id: inc.id,
                        name: inc.incident_type || (inc as any).type,
                        details: `Severity: ${inc.severity} • Affected Parcels: ${inc.affected_parcels} • Facility: ${wh?.name || inc.warehouse_id}`,
                        x: coord.x,
                        y: coord.y,
                      })
                    }
                    onMouseLeave={() => setHoveredEntity(null)}
                  >
                    {/* Pulsing Hazard Danger Waves */}
                    <circle cx="0" cy="0" r="22" fill="none" stroke="#ff3366" strokeWidth="2" className="pulse-danger-anim" />
                    <circle cx="0" cy="0" r="32" fill="none" stroke="#ff3366" strokeWidth="1" strokeDasharray="4, 4" className="pulse-danger-anim" />

                    {/* Threat Marker Badge */}
                    <g transform="translate(18, -18)">
                      <circle cx="0" cy="0" r="10" fill="#ff3366" filter="url(#glow-danger)" />
                      <text x="0" y="3.5" fill="#ffffff" fontSize="10" fontWeight="900" textAnchor="middle">
                        !
                      </text>
                    </g>
                  </g>
                );
              })}
          </g>
        )}

        {/* 8. Dynamic Trucks / Moving Fleet */}
        {showTrucks && (
          <g>
            {truckPositions.map((truck) => {
              const isSelected = truck.isSelected;
              const isDelayed = truck.status === 'DELAYED';
              const truckColor = isDelayed ? '#f59e0b' : isSelected ? '#00f0ff' : '#10b981';

              return (
                <g
                  key={truck.id}
                  transform={`translate(${truck.x}, ${truck.y})`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => selectEntity('TRUCK', truck.id, truck.position)}
                  onMouseEnter={() =>
                    setHoveredEntity({
                      type: 'TRUCK',
                      id: truck.id,
                      name: `${truck.name} (${truck.license_plate})`,
                      details: `Speed: ${truck.speed_kmh} km/h • Load: ${truck.current_load_kg}/${truck.capacity_kg} kg • Status: ${truck.status}`,
                      x: truck.x,
                      y: truck.y,
                    })
                  }
                  onMouseLeave={() => setHoveredEntity(null)}
                >
                  {/* Selection Aura */}
                  {isSelected && (
                    <circle cx="0" cy="0" r="16" fill="none" stroke="#00f0ff" strokeWidth="1.5" className="pulse-ring-anim" />
                  )}

                  {/* Truck Vehicle Marker */}
                  <rect
                    x="-8"
                    y="-8"
                    width="16"
                    height="16"
                    rx="3"
                    fill="rgba(6, 11, 24, 0.95)"
                    stroke={truckColor}
                    strokeWidth={isSelected ? 2 : 1.2}
                    transform="rotate(45)"
                  />

                  <circle cx="0" cy="0" r="3" fill={truckColor} />

                  {/* Truck ID Tag */}
                  <g transform="translate(0, -14)">
                    <rect x="-22" y="-9" width="44" height="12" rx="3" fill="rgba(6, 11, 24, 0.9)" stroke={truckColor} strokeWidth="0.8" />
                    <text x="0" y="-0.5" fill="#f8fafc" fontSize="7.5" fontWeight="700" fontFamily="JetBrains Mono, monospace" textAnchor="middle">
                      {truck.id} • {truck.speed_kmh}k
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        )}
      </svg>

      {/* Interactive Tooltip Card on Hover */}
      {hoveredEntity && (
        <div
          className="glass-card"
          style={{
            position: 'absolute',
            left: `${mouseCoord.x + 16}px`,
            top: `${mouseCoord.y + 16}px`,
            zIndex: 60,
            padding: '10px 14px',
            background: 'rgba(6, 11, 24, 0.95)',
            border: '1px solid #00f0ff',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.9), 0 0 16px rgba(0, 240, 255, 0.3)',
            borderRadius: '8px',
            pointerEvents: 'none',
            maxWidth: '280px',
            animation: 'fadeIn 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span
              className="badge-status badge-status-active"
              style={{ fontSize: '0.62rem', padding: '1px 5px' }}
            >
              {hoveredEntity.type}
            </span>
            <span className="font-mono text-xs" style={{ color: '#00f0ff', fontWeight: 700 }}>
              {hoveredEntity.id}
            </span>
          </div>

          <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
            {hoveredEntity.name}
          </h4>

          <p style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.35 }}>
            {hoveredEntity.details}
          </p>

          <span
            style={{
              fontSize: '0.62rem',
              color: '#00f0ff',
              marginTop: '6px',
              display: 'block',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            Click to inspect telemetry in dossier →
          </span>
        </div>
      )}
    </div>
  );
};
