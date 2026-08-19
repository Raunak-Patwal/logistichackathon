import React from 'react';
import {
  AlertTriangle,
  Flame,
  ShieldAlert,
  Building2,
  Clock,
  Package,
  Truck,
  ArrowUpRight,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useWorldModelStore } from '../../state/useWorldModelStore';
import { useUIStore } from '../../state/useUIStore';

export const IncidentsView: React.FC = () => {
  const incidents = useWorldModelStore((s) => s.incidents);
  const warehouses = useWorldModelStore((s) => s.warehouses);
  const selectEntity = useUIStore((s) => s.selectEntity);
  const setActiveView = useUIStore((s) => s.setActiveView);

  const handleInspectIncident = (incidentId: string, warehouseId: string) => {
    const wh = warehouses.find((w) => w.id === warehouseId);
    const pos = wh ? wh.position : undefined;
    selectEntity('INCIDENT', incidentId, pos);
  };

  const activeCount = incidents.filter((i) => i.status !== 'RESOLVED').length;

  return (
    <div
      className="glass-card"
      style={{
        position: 'absolute',
        top: '76px',
        left: '24px',
        bottom: '84px',
        width: '520px',
        maxWidth: 'calc(100vw - 48px)',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.95)',
        border: '1px solid rgba(0, 240, 255, 0.28)',
        borderRadius: '16px',
        overflow: 'hidden',
        animation: 'fadeInScale 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid rgba(0, 240, 255, 0.2)',
          background: 'linear-gradient(90deg, rgba(8, 14, 28, 0.9) 0%, rgba(4, 7, 17, 0.9) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={18} color="#ff3366" />
          <div>
            <h2 className="font-display" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
              OPERATIONAL INCIDENTS & ANOMALY RADAR
            </h2>
            <span className="font-mono text-xs" style={{ color: '#00f0ff' }}>
              GEMINI 2.5 FLASH CAUSAL REASONING
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge-status badge-status-critical">
            {activeCount} ACTIVE
          </span>
          <button
            className="cyber-btn"
            onClick={() => setActiveView('WORLD')}
            style={{ padding: '3px 8px', borderRadius: '50%' }}
            title="Close Panel"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Incidents List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {incidents.map((inc) => {
          const isResolved = inc.status === 'RESOLVED';
          const isHigh = inc.severity === 'HIGH' || inc.severity === 'CRITICAL';
          const wh = warehouses.find((w) => w.id === inc.warehouse_id);

          return (
            <div
              key={inc.id}
              className="glass-card"
              style={{
                padding: '14px',
                borderLeft: `4px solid ${isResolved ? '#10b981' : isHigh ? '#ff3366' : '#f59e0b'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span className="font-mono" style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc' }}>
                      {inc.id}: {(inc as any).incident_type || inc.type || 'Operational Disruption'}
                    </span>
                    <span className={`badge-status ${isResolved ? 'badge-status-success' : isHigh ? 'badge-status-critical' : 'badge-status-warning'}`}>
                      {isResolved ? 'RESOLVED' : inc.severity}
                    </span>
                  </div>
                  <span className="text-xs" style={{ color: '#94a3b8' }}>
                    Affected Facility: <strong style={{ color: '#f8fafc' }}>{wh?.name || inc.warehouse_id}</strong> ({inc.warehouse_id})
                  </span>
                </div>

                <button
                  className="cyber-btn"
                  onClick={() => handleInspectIncident(inc.id, inc.warehouse_id)}
                  style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                >
                  <Sparkles size={12} color="#00f0ff" />
                  <span>AI DIAGNOSTICS</span>
                </button>
              </div>

              {/* Impact Matrix */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  padding: '10px',
                  borderRadius: '4px',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="text-xs" style={{ color: '#94a3b8' }}>Affected Parcels</span>
                  <span className="font-mono text-sm" style={{ color: isResolved ? '#10b981' : '#ff3366', fontWeight: 700 }}>
                    {inc.affected_parcels} units
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="text-xs" style={{ color: '#94a3b8' }}>Affected Trucks</span>
                  <span className="font-mono text-sm" style={{ color: isResolved ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                    {inc.affected_trucks} vehicles
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="text-xs" style={{ color: '#94a3b8' }}>Duration / SLA</span>
                  <span className="font-mono text-sm" style={{ color: '#f8fafc', fontWeight: 700 }}>
                    {inc.duration_mins} mins
                  </span>
                </div>
              </div>

              {/* Context Builder Dossier Breakdown */}
              <div
                style={{
                  padding: '10px',
                  background: 'rgba(8, 14, 28, 0.8)',
                  borderRadius: '4px',
                  border: '1px solid rgba(0, 240, 255, 0.15)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <span className="font-mono text-xs" style={{ color: '#00f0ff', marginBottom: '2px', fontWeight: 700 }}>
                  PHASE 2 CONTEXT BUILDER DOSSIER:
                </span>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                  <span style={{ color: '#94a3b8' }}>Facility Storage Capacity:</span>
                  <span className="font-mono" style={{ color: '#f59e0b' }}>
                    {inc.context.warehouse_capacity_percent || 92}%
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                  <span style={{ color: '#94a3b8' }}>Cold-Chain Priority Shipments:</span>
                  <span className="font-mono" style={{ color: '#00f0ff' }}>
                    {inc.context.cold_storage_parcels || 140} parcels
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                  <span style={{ color: '#94a3b8' }}>Critical Medicine Shipments:</span>
                  <span className="font-mono" style={{ color: '#ff3366', fontWeight: 600 }}>
                    {inc.context.medicine_shipments || 85} packages
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                  <span style={{ color: '#94a3b8' }}>Nearest Backup Scanner:</span>
                  <span style={{ color: '#10b981' }}>{inc.context.nearest_backup_scanner || 'Hub Delhi Aux Terminal #2'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

