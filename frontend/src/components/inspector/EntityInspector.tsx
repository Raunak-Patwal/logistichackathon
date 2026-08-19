import React, { useState } from 'react';
import {
  X,
  Package,
  Truck,
  Building2,
  Plane,
  AlertTriangle,
  ArrowRight,
  Clock,
  MapPin,
  User,
  Shield,
  Layers,
  ChevronRight,
  Sparkles,
  Zap,
  CheckCircle2,
  Database,
  Cpu,
} from 'lucide-react';
import { useUIStore } from '../../state/useUIStore';
import { useWorldModelStore } from '../../state/useWorldModelStore';
import { STATE_FLOW_ORDER } from '../../domain/stateMachine';
import { ParcelState } from '../../domain/worldModel';
import { simulationEngine } from '../../api/simulationEngine';
import { apiClient } from '../../api/client';

export const EntityInspector: React.FC = () => {
  const selectedType = useUIStore((s) => s.selectedEntityType);
  const selectedId = useUIStore((s) => s.selectedEntityId);
  const inspectorOpen = useUIStore((s) => s.inspectorOpen);
  const setInspectorOpen = useUIStore((s) => s.setInspectorOpen);
  const selectEntity = useUIStore((s) => s.selectEntity);

  const parcels = useWorldModelStore((s) => s.parcels);
  const trucks = useWorldModelStore((s) => s.trucks);
  const warehouses = useWorldModelStore((s) => s.warehouses);
  const airports = useWorldModelStore((s) => s.airports);
  const incidents = useWorldModelStore((s) => s.incidents);
  const resolveIncident = useWorldModelStore((s) => s.resolveIncident);

  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  if (!inspectorOpen || !selectedType || !selectedId) return null;

  const parcel = parcels.find((p) => p.id === selectedId);
  const truck = trucks.find((t) => t.id === selectedId);
  const warehouse = warehouses.find((w) => w.id === selectedId);
  const airport = airports.find((a) => a.id === selectedId);
  const incident = incidents.find((i) => i.id === selectedId);

  const handleExecuteAction = async (actionId: string, actionName: string, targetWhId: string) => {
    setExecutingActionId(actionId);
    try {
      const payload = {
        action_id: actionId,
        action_name: actionName,
        incident_id: selectedId,
        target_entity_id: targetWhId,
        reason: `Operator authorized action ${actionName} from AI Logistics Mission Control.`,
      };

      const res = await apiClient.executeIncidentAction(selectedId, payload);
      resolveIncident(selectedId);
      setActionSuccessMsg(res.message || `Action ${actionName} executed successfully! Dual-commit confirmed.`);
      setTimeout(() => setActionSuccessMsg(null), 5000);
    } catch (e) {
      console.error('Failed to execute action:', e);
    } finally {
      setExecutingActionId(null);
    }
  };

  return (
    <aside className="glass-drawer">
      {/* Header */}
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid rgba(0, 240, 255, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(90deg, rgba(8, 14, 28, 0.9) 0%, rgba(4, 7, 17, 0.9) 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {selectedType === 'PARCEL' && <Package size={18} color="#00f0ff" />}
          {selectedType === 'TRUCK' && <Truck size={18} color="#00f0ff" />}
          {selectedType === 'WAREHOUSE' && <Building2 size={18} color="#00f0ff" />}
          {selectedType === 'AIRPORT' && <Plane size={18} color="#00f0ff" />}
          {selectedType === 'INCIDENT' && <AlertTriangle size={18} color="#ff3366" />}

          <div>
            <span className="font-mono text-xs" style={{ color: '#00f0ff', letterSpacing: '0.08em' }}>
              {selectedType} TELEMETRY DOSSIER
            </span>
            <h3
              className="font-mono"
              style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', letterSpacing: '0.04em' }}
            >
              {selectedId}
            </h3>
          </div>
        </div>

        <button
          className="cyber-btn"
          onClick={() => setInspectorOpen(false)}
          style={{ padding: '5px 8px' }}
        >
          <X size={14} color="#00f0ff" />
        </button>
      </div>

      {/* Success Notification Banner */}
      {actionSuccessMsg && (
        <div
          style={{
            padding: '10px 14px',
            background: 'rgba(16, 185, 129, 0.2)',
            borderBottom: '1px solid #10b981',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#10b981',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.75rem',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Body Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* PARCEL VIEW */}
        {selectedType === 'PARCEL' && parcel && (
          <>
            <div>
              <span className="font-mono text-xs" style={{ color: '#94a3b8', marginBottom: '8px', display: 'block' }}>
                STATE MACHINE LIFECYCLE PROGRESSION
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {STATE_FLOW_ORDER.map((st, idx) => {
                  const currentIndex = STATE_FLOW_ORDER.indexOf(parcel.state);
                  const isPast = idx <= currentIndex;
                  const isCurrent = idx === currentIndex;

                  return (
                    <React.Fragment key={st}>
                      <div
                        style={{
                          flex: 1,
                          padding: '6px 2px',
                          borderRadius: '4px',
                          textAlign: 'center',
                          fontFamily: 'Rajdhani, sans-serif',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor: isCurrent
                            ? 'rgba(0, 240, 255, 0.2)'
                            : isPast
                            ? 'rgba(16, 185, 129, 0.15)'
                            : 'rgba(255, 255, 255, 0.03)',
                          border: `1px solid ${
                            isCurrent
                              ? '#00f0ff'
                              : isPast
                              ? '#10b981'
                              : 'rgba(255, 255, 255, 0.08)'
                          }`,
                          color: isCurrent ? '#00f0ff' : isPast ? '#10b981' : '#64748b',
                        }}
                      >
                        {st}
                      </div>
                      {idx < STATE_FLOW_ORDER.length - 1 && (
                        <ChevronRight size={10} color={isPast ? '#10b981' : '#475569'} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-xs" style={{ color: '#94a3b8' }}>Priority Class</span>
                <span className="badge-status badge-status-active">{parcel.priority}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-xs" style={{ color: '#94a3b8' }}>Weight</span>
                <span className="font-mono text-xs" style={{ color: '#f8fafc' }}>{parcel.weight_kg} KG</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-xs" style={{ color: '#94a3b8' }}>Destination</span>
                <span className="text-xs" style={{ color: '#f8fafc', fontWeight: 600 }}>{parcel.destination}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-xs" style={{ color: '#94a3b8' }}>State Machine Schema</span>
                <span className="font-mono text-xs" style={{ color: '#00f0ff' }}>PostgreSQL v{parcel.version}</span>
              </div>
            </div>

            {/* Related Entities */}
            <div>
              <span className="font-mono text-xs" style={{ color: '#94a3b8', marginBottom: '8px', display: 'block' }}>
                SUPPLY CHAIN RELATIONSHIPS
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {parcel.current_truck_id && (
                  <div
                    onClick={() => selectEntity('TRUCK', parcel.current_truck_id!)}
                    style={{
                      padding: '8px 10px',
                      background: 'rgba(0, 240, 255, 0.05)',
                      border: '1px solid rgba(0, 240, 255, 0.2)',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Truck size={14} color="#00f0ff" />
                      <span className="text-xs" style={{ color: '#f8fafc' }}>Assigned Hauler</span>
                    </div>
                    <span className="font-mono text-xs" style={{ color: '#00f0ff' }}>{parcel.current_truck_id} →</span>
                  </div>
                )}

                {parcel.current_warehouse_id && (
                  <div
                    onClick={() => selectEntity('WAREHOUSE', parcel.current_warehouse_id!)}
                    style={{
                      padding: '8px 10px',
                      background: 'rgba(0, 240, 255, 0.05)',
                      border: '1px solid rgba(0, 240, 255, 0.2)',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Building2 size={14} color="#00f0ff" />
                      <span className="text-xs" style={{ color: '#f8fafc' }}>Warehouse Hub</span>
                    </div>
                    <span className="font-mono text-xs" style={{ color: '#00f0ff' }}>{parcel.current_warehouse_id} →</span>
                  </div>
                )}
              </div>
            </div>

            {/* Audit Trail */}
            <div>
              <span className="font-mono text-xs" style={{ color: '#94a3b8', marginBottom: '8px', display: 'block' }}>
                IMMUTABLE AUDIT TRAIL (EVENT STORE)
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {parcel.history.map((h, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '8px 10px',
                      background: 'rgba(8, 14, 28, 0.7)',
                      borderLeft: '3px solid #00f0ff',
                      borderRadius: '0 4px 4px 0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="font-mono text-xs" style={{ color: '#00f0ff', fontWeight: 700 }}>
                        {h.event_type}
                      </span>
                      <span className="font-mono" style={{ fontSize: '0.68rem', color: '#64748b' }}>
                        {h.timestamp}
                      </span>
                    </div>
                    <span className="text-xs" style={{ color: '#94a3b8' }}>{h.description}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid rgba(0, 240, 255, 0.2)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                className="cyber-btn"
                onClick={() => useUIStore.getState().triggerSignatureReconstruction(parcel.id)}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Sparkles size={14} color="#00f0ff" />
                <span>RECONSTRUCT 3D TIMELINE REPLAY</span>
              </button>
            </div>
          </>
        )}

        {/* TRUCK VIEW */}
        {selectedType === 'TRUCK' && truck && (
          <>
            <div className="glass-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-xs" style={{ color: '#94a3b8' }}>Vehicle Chassis</span>
                <span className="text-xs" style={{ color: '#f8fafc', fontWeight: 700 }}>{truck.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-xs" style={{ color: '#94a3b8' }}>License Plate</span>
                <span className="font-mono text-xs" style={{ color: '#00f0ff' }}>{truck.license_plate}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-xs" style={{ color: '#94a3b8' }}>Current Velocity</span>
                <span className="font-mono text-xs" style={{ color: '#f8fafc' }}>{truck.speed_kmh} KM/H</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-xs" style={{ color: '#94a3b8' }}>Payload Load</span>
                <span className="font-mono text-xs" style={{ color: '#f8fafc' }}>
                  {truck.current_load_kg} / {truck.capacity_kg} KG ({((truck.current_load_kg / truck.capacity_kg) * 100).toFixed(0)}%)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-xs" style={{ color: '#94a3b8' }}>Status</span>
                <span className="badge-status badge-status-active">{truck.status}</span>
              </div>
            </div>

            {/* Manifest */}
            <div>
              <span className="font-mono text-xs" style={{ color: '#94a3b8', marginBottom: '8px', display: 'block' }}>
                MANIFEST PAYLOADS ({truck.parcel_ids.length})
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {truck.parcel_ids.map((pid) => (
                  <div
                    key={pid}
                    onClick={() => selectEntity('PARCEL', pid)}
                    style={{
                      padding: '8px 10px',
                      background: 'rgba(0, 240, 255, 0.04)',
                      border: '1px solid rgba(0, 240, 255, 0.15)',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Package size={13} color="#00f0ff" />
                      <span className="font-mono text-xs" style={{ color: '#f8fafc' }}>{pid}</span>
                    </div>
                    <span className="text-xs" style={{ color: '#00f0ff' }}>Inspect →</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* WAREHOUSE VIEW */}
        {selectedType === 'WAREHOUSE' && warehouse && (
          <>
            <div className="glass-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-xs" style={{ color: '#94a3b8' }}>Facility Hub</span>
                <span className="text-xs" style={{ color: '#f8fafc', fontWeight: 700 }}>{warehouse.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-xs" style={{ color: '#94a3b8' }}>Operational Status</span>
                <span className="badge-status badge-status-active">{warehouse.status}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-xs" style={{ color: '#94a3b8' }}>Occupancy Rate</span>
                <span className="font-mono text-xs" style={{ color: '#00f0ff' }}>
                  {warehouse.current_parcels_count} / {warehouse.capacity_parcels} (
                  {((warehouse.current_parcels_count / warehouse.capacity_parcels) * 100).toFixed(0)}%)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-xs" style={{ color: '#94a3b8' }}>Dock Utilization</span>
                <span className="font-mono text-xs" style={{ color: '#f8fafc' }}>
                  {warehouse.active_docks_occupied} / {warehouse.dock_count} Active
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-xs" style={{ color: '#94a3b8' }}>Pharma Cold Storage</span>
                <span className="font-mono text-xs" style={{ color: warehouse.has_cold_storage ? '#10b981' : '#64748b' }}>
                  {warehouse.has_cold_storage ? 'CERTIFIED ACTIVE' : 'NONE'}
                </span>
              </div>
            </div>
          </>
        )}

        {/* INCIDENT VIEW - 10X AI MISSION CONTROL */}
        {selectedType === 'INCIDENT' && incident && (
          <>
            {/* Status & Diagnostic Gauge */}
            <div
              className="glass-card"
              style={{
                padding: '14px',
                borderLeft: '4px solid #ff3366',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <span className="font-mono text-xs" style={{ color: '#ff3366', fontWeight: 700 }}>
                  CRITICAL OPERATIONAL DISRUPTION
                </span>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
                  {(incident as any).incident_type || incident.type || 'Operational Disruption'}
                </h4>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '11px' }}>
                  <span className="badge-status badge-status-critical">{incident.severity}</span>
                  <span className="badge-status badge-status-active">{incident.status}</span>
                </div>
              </div>

              {/* Circular SVG Telemetry Gauge */}
              <div style={{ position: 'relative', width: '56px', height: '56px' }}>
                <svg width="56" height="56" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth="3.5"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={incident.status === 'RESOLVED' ? '#10b981' : '#ff3366'}
                    strokeDasharray={incident.status === 'RESOLVED' ? '100, 100' : '88, 100'}
                    strokeWidth="3.5"
                  />
                </svg>
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 700,
                    color: '#f8fafc',
                  }}
                >
                  {incident.status === 'RESOLVED' ? '100%' : '88%'}
                  <span style={{ fontSize: '7px', color: '#94a3b8' }}>RISK</span>
                </div>
              </div>
            </div>

            {/* 4-Tier Root Cause Causation Chain */}
            <div>
              <span className="font-mono text-xs" style={{ color: '#00f0ff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Cpu size={13} /> 4-TIER CAUSAL DIAGNOSTIC CHAIN
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[
                  { step: '1. TRIGGER', label: 'Primary Barcode Scanner Failure (Hardware Error Code 502)', color: '#ff3366' },
                  { step: '2. SYMPTOM', label: 'Inbound Dock Queue Stalled at Delhi Hub W12 (0/4 Docks)', color: '#f59e0b' },
                  { step: '3. CONSTRAINT', label: 'Cold-chain vaccine batches expiring in 18 minutes (Pharma SLA violation)', color: '#00f0ff' },
                  { step: '4. ROOT CAUSE', label: 'Firmware sync timeout on legacy scanner bus during high-volume batch ingest', color: '#a855f7' },
                ].map((c, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '8px 10px',
                      background: 'rgba(8, 14, 28, 0.8)',
                      borderLeft: `3px solid ${c.color}`,
                      borderRadius: '0 4px 4px 0',
                    }}
                  >
                    <div style={{ fontSize: '9px', fontFamily: 'JetBrains Mono, monospace', color: c.color, fontWeight: 700 }}>
                      {c.step}
                    </div>
                    <div style={{ fontSize: '11px', color: '#f8fafc', marginTop: '2px' }}>
                      {c.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PgVector RAG Historical Memory Card */}
            <div
              style={{
                padding: '12px',
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(8, 14, 28, 0.8) 100%)',
                border: '1px solid rgba(168, 85, 247, 0.4)',
                borderRadius: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Database size={13} color="#a855f7" />
                  <span className="font-mono text-xs" style={{ color: '#d8b4fe', fontWeight: 700 }}>
                    PGVECTOR RAG SIMILARITY MATCH
                  </span>
                </div>
                <span
                  style={{
                    background: 'rgba(168, 85, 247, 0.3)',
                    color: '#f8fafc',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '10px',
                    fontWeight: 700,
                  }}
                >
                  94.2% COSINE MATCH
                </span>
              </div>
              <p style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '6px', lineHeight: 1.4 }}>
                Past incident <strong style={{ color: '#00f0ff' }}>INC-4912</strong> (Mumbai Hub): Automated swap to mobile Bluetooth scanning terminals reduced truck turnaround delay from 48 mins to 6 mins without cargo offloading penalty.
              </p>
            </div>

            {/* AI Ranked Mitigation Actions */}
            <div>
              <span className="font-mono text-xs" style={{ color: '#00f0ff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={13} /> AI REASONED MITIGATION ACTIONS
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  {
                    id: 'ACT-1',
                    name: 'Deploy Backup Handheld Scanners & Prioritize Pharma Dock 1',
                    cost: '$120',
                    time: '8 mins',
                    risk: '5%',
                    recommended: true,
                  },
                  {
                    id: 'ACT-2',
                    name: 'Emergency Reroute Incoming In-Transit Trucks to Noida W08',
                    cost: '$450',
                    time: '35 mins',
                    risk: '28%',
                    recommended: false,
                  },
                ].map((act) => (
                  <div
                    key={act.id}
                    style={{
                      padding: '12px',
                      background: act.recommended ? 'rgba(0, 240, 255, 0.08)' : 'rgba(8, 14, 28, 0.7)',
                      border: act.recommended ? '1px solid #00f0ff' : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        {act.recommended && (
                          <span
                            style={{
                              background: '#00f0ff',
                              color: '#040711',
                              fontSize: '8.5px',
                              fontFamily: 'JetBrains Mono, monospace',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: '3px',
                              marginBottom: '4px',
                              display: 'inline-block',
                            }}
                          >
                            RECOMMENDED ACTION
                          </span>
                        )}
                        <h5 style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>
                          {act.name}
                        </h5>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', fontSize: '10px', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>
                      <span>COST: <strong style={{ color: '#f8fafc' }}>{act.cost}</strong></span>
                      <span>•</span>
                      <span>TIME: <strong style={{ color: '#f8fafc' }}>{act.time}</strong></span>
                      <span>•</span>
                      <span>RISK: <strong style={{ color: '#10b981' }}>{act.risk}</strong></span>
                    </div>

                    <button
                      className="cyber-btn"
                      disabled={executingActionId !== null || incident.status === 'RESOLVED'}
                      onClick={() => handleExecuteAction(act.id, act.name, incident.warehouse_id)}
                      style={{
                        marginTop: '4px',
                        justifyContent: 'center',
                        background: incident.status === 'RESOLVED'
                          ? 'rgba(16, 185, 129, 0.2)'
                          : act.recommended
                          ? 'linear-gradient(135deg, #00f0ff 0%, #0284c7 100%)'
                          : 'rgba(255, 255, 255, 0.05)',
                        color: act.recommended && incident.status !== 'RESOLVED' ? '#040711' : '#f8fafc',
                        fontWeight: 700,
                      }}
                    >
                      {executingActionId === act.id ? (
                        <span>COMMITTING DUAL-TRANSACTION...</span>
                      ) : incident.status === 'RESOLVED' ? (
                        <span>✓ RESOLUTION COMMITTED</span>
                      ) : (
                        <span>EXECUTE ACTION VIA BACKEND</span>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
