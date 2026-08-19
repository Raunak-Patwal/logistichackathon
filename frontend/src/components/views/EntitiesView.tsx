import React, { useState } from 'react';
import {
  Boxes,
  Package,
  Truck,
  Building2,
  Plane,
  User,
  ArrowUpRight,
} from 'lucide-react';
import { useWorldModelStore } from '../../state/useWorldModelStore';
import { useUIStore } from '../../state/useUIStore';

export const EntitiesView: React.FC = () => {
  const [tab, setTab] = useState<'PARCELS' | 'TRUCKS' | 'WAREHOUSES' | 'AIRPORTS' | 'DRIVERS'>('PARCELS');

  const parcels = useWorldModelStore((s) => s.parcels);
  const trucks = useWorldModelStore((s) => s.trucks);
  const warehouses = useWorldModelStore((s) => s.warehouses);
  const airports = useWorldModelStore((s) => s.airports);
  const drivers = useWorldModelStore((s) => s.drivers);

  const selectEntity = useUIStore((s) => s.selectEntity);
  const setActiveView = useUIStore((s) => s.setActiveView);

  return (
    <div
      className="glass-card"
      style={{
        position: 'absolute',
        top: '76px',
        left: '24px',
        bottom: '84px',
        width: '560px',
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
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Boxes size={18} color="#00f0ff" />
            <div>
              <h2 className="font-display" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                MATERIALIZED WORLD MODEL
              </h2>
              <span className="font-mono text-xs" style={{ color: '#00f0ff', letterSpacing: '0.04em' }}>
                CURRENT OPERATIONAL BELIEF PROJECTION (POSTGRESQL 16)
              </span>
            </div>
          </div>

          <button
            className="cyber-btn"
            onClick={() => setActiveView('WORLD')}
            style={{ padding: '3px 8px', borderRadius: '50%' }}
            title="Close Panel"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { id: 'PARCELS', label: `PARCELS (${parcels.length})`, icon: Package },
            { id: 'TRUCKS', label: `TRUCKS (${trucks.length})`, icon: Truck },
            { id: 'WAREHOUSES', label: `HUBS (${warehouses.length})`, icon: Building2 },
            { id: 'AIRPORTS', label: `AIRPORTS (${airports.length})`, icon: Plane },
            { id: 'DRIVERS', label: `DRIVERS (${drivers.length})`, icon: User },
          ].map((t) => (
            <button
              key={t.id}
              className="cyber-btn"
              onClick={() => setTab(t.id as any)}
              style={{
                flex: 1,
                padding: '4px 6px',
                fontSize: '0.68rem',
                justifyContent: 'center',
                background: tab === t.id ? 'linear-gradient(135deg, rgba(0, 240, 255, 0.3) 0%, rgba(2, 132, 199, 0.2) 100%)' : 'rgba(255, 255, 255, 0.03)',
                borderColor: tab === t.id ? '#00f0ff' : 'rgba(255, 255, 255, 0.08)',
                color: tab === t.id ? '#00f0ff' : '#94a3b8',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Entity List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {tab === 'PARCELS' &&
          parcels.map((p) => (
            <div
              key={p.id}
              className="glass-card"
              style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="font-mono text-xs" style={{ color: '#f8fafc', fontWeight: 700 }}>{p.id}</span>
                  <span className="badge-status badge-status-active">{p.state}</span>
                  <span className="badge-status badge-status-dormant" style={{ fontSize: '0.62rem' }}>{p.priority}</span>
                </div>
                <span className="text-xs" style={{ color: '#94a3b8' }}>
                  Destination: {p.destination} • {p.weight_kg} KG • PostgreSQL v{p.version}
                </span>
              </div>
              <button
                className="cyber-btn"
                onClick={() => selectEntity('PARCEL', p.id)}
                style={{ padding: '4px 8px', fontSize: '0.7rem', color: '#00f0ff' }}
              >
                <ArrowUpRight size={12} />
                <span>INSPECT</span>
              </button>
            </div>
          ))}

        {tab === 'TRUCKS' &&
          trucks.map((t) => (
            <div
              key={t.id}
              className="glass-card"
              style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="font-mono text-xs" style={{ color: '#f8fafc', fontWeight: 700 }}>{t.id}</span>
                  <span className="badge-status badge-status-active">{t.status}</span>
                  <span className="font-mono text-xs" style={{ color: '#00f0ff' }}>{t.license_plate}</span>
                </div>
                <span className="text-xs" style={{ color: '#94a3b8' }}>
                  {t.name} • {t.speed_kmh} KM/H • {t.parcel_ids.length} parcels loaded
                </span>
              </div>
              <button
                className="cyber-btn"
                onClick={() => selectEntity('TRUCK', t.id, t.position)}
                style={{ padding: '4px 8px', fontSize: '0.7rem', color: '#00f0ff' }}
              >
                <ArrowUpRight size={12} />
                <span>FOCUS 3D</span>
              </button>
            </div>
          ))}

        {tab === 'WAREHOUSES' &&
          warehouses.map((w) => (
            <div
              key={w.id}
              className="glass-card"
              style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="font-mono text-xs" style={{ color: '#f8fafc', fontWeight: 700 }}>{w.code}</span>
                  <span className="badge-status badge-status-active">{w.status}</span>
                </div>
                <span className="text-xs" style={{ color: '#94a3b8' }}>
                  {w.name} ({w.region}) • {w.current_parcels_count} / {w.capacity_parcels} parcels
                </span>
              </div>
              <button
                className="cyber-btn"
                onClick={() => selectEntity('WAREHOUSE', w.id, w.position)}
                style={{ padding: '4px 8px', fontSize: '0.7rem', color: '#00f0ff' }}
              >
                <ArrowUpRight size={12} />
                <span>FOCUS 3D</span>
              </button>
            </div>
          ))}

        {tab === 'AIRPORTS' &&
          airports.map((a) => (
            <div
              key={a.id}
              className="glass-card"
              style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="font-mono text-xs" style={{ color: '#f8fafc', fontWeight: 700 }}>✈ {a.iata}</span>
                  <span className="badge-status badge-status-active">{a.status}</span>
                </div>
                <span className="text-xs" style={{ color: '#94a3b8' }}>
                  {a.name} • {a.cargo_throughput_tons_day} tons/day
                </span>
              </div>
              <button
                className="cyber-btn"
                onClick={() => selectEntity('AIRPORT', a.id, a.position)}
                style={{ padding: '4px 8px', fontSize: '0.7rem', color: '#00f0ff' }}
              >
                <ArrowUpRight size={12} />
                <span>FOCUS 3D</span>
              </button>
            </div>
          ))}

        {tab === 'DRIVERS' &&
          drivers.map((d) => (
            <div
              key={d.id}
              className="glass-card"
              style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="font-mono text-xs" style={{ color: '#f8fafc', fontWeight: 700 }}>{d.name}</span>
                  <span className="badge-status badge-status-active">{d.status}</span>
                  <span className="font-mono text-xs" style={{ color: '#f59e0b' }}>★ {d.rating}</span>
                </div>
                <span className="text-xs" style={{ color: '#94a3b8' }}>
                  License: {d.license_number} • Truck: {d.assigned_truck_id || 'None'} • Shift: {d.shift_hours}h
                </span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

