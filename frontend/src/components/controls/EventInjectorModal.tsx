import React, { useState } from 'react';
import { X, Send, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';
import { useUIStore } from '../../state/useUIStore';
import { simulationEngine } from '../../api/simulationEngine';
import { apiClient } from '../../api/client';
import { EventType } from '../../domain/uleo';

export const EventInjectorModal: React.FC = () => {
  const isOpen = useUIStore((s) => s.eventInjectorOpen);
  const setIsOpen = useUIStore((s) => s.setEventInjectorOpen);

  const [eventType, setEventType] = useState<EventType>('PARCEL_LOADED');
  const [entityId, setEntityId] = useState('P-1021');
  const [source, setSource] = useState('WMS_ZEBRA_SCANNER_04');
  const [truckId, setTruckId] = useState('T-184');
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleEmit = async () => {
    setLoading(true);
    try {
      const res = await apiClient.ingestEvent({
        event_type: eventType,
        entity_id: entityId,
        source,
        payload: {
          truck_id: truckId,
          operator: 'OPR-LIVE',
          timestamp: new Date().toISOString(),
        },
      });
      setResult(res);
    } catch (e: any) {
      setResult({ status: 'REJECTED', message: e.message, dual_commit: { latency_ms: 0 } });
    } finally {
      setLoading(false);
    }
  };

  const handleTestIllegal = async () => {
    setLoading(true);
    try {
      const res = await apiClient.ingestEvent({
        event_type: 'PARCEL_DELIVERED',
        entity_id: 'P-1022',
        source: 'UNVERIFIED_CLIENT_SCANNER',
        payload: { proof_of_delivery: 'FORGED_POD' },
      });
      setResult(res);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(12px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={() => setIsOpen(false)}
    >
      <div
        className="glass-card"
        style={{
          width: '540px',
          maxWidth: '90%',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          border: '1px solid rgba(0, 240, 255, 0.3)',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.95), 0 0 20px rgba(0, 240, 255, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap size={20} color="#00f0ff" />
            <h3 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
              LIVE ULEO EVENT INJECTOR
            </h3>
          </div>
          <button className="cyber-btn" onClick={() => setIsOpen(false)} style={{ padding: '4px 8px' }}>
            <X size={14} color="#00f0ff" />
          </button>
        </div>

        {/* RBAC Security Notice if Unauthorized */}
        {!apiClient.canInjectEvents() && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#f59e0b',
              fontSize: '0.76rem',
            }}
          >
            <ShieldCheck size={18} color="#f59e0b" style={{ flexShrink: 0 }} />
            <span>
              <strong>READ-ONLY OPERATIONAL SESSION:</strong> Event injection to PostgreSQL/Redis stream is locked for your current role. Switch to Dispatcher or Admin to inject events.
            </span>
          </div>
        )}

        {/* Preset Invariant Test Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="cyber-btn"
            disabled={!apiClient.canInjectEvents()}
            onClick={() => {
              setEventType('PARCEL_LOADED');
              setEntityId('P-1021');
              setTruckId('T-184');
            }}
            style={{
              flex: 1,
              fontSize: '0.72rem',
              justifyContent: 'center',
              opacity: apiClient.canInjectEvents() ? 1 : 0.5,
            }}
          >
            VALID: LOAD P-1021 → T-184
          </button>

          <button
            className="cyber-btn"
            disabled={!apiClient.canInjectEvents()}
            onClick={handleTestIllegal}
            style={{
              flex: 1,
              fontSize: '0.72rem',
              justifyContent: 'center',
              borderColor: '#ff3366',
              color: '#ff3366',
              opacity: apiClient.canInjectEvents() ? 1 : 0.5,
            }}
            title="Attempts direct CREATED → DELIVERED transition to verify domain invariant rejection"
          >
            TEST ILLEGAL INVARIANT VIOLATION
          </button>
        </div>

        {/* Ingestion Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label className="font-mono text-xs" style={{ color: '#00f0ff', fontWeight: 600 }}>EVENT TYPE</label>
            <select
              value={eventType}
              disabled={!apiClient.canInjectEvents()}
              onChange={(e) => setEventType(e.target.value as any)}
              className="font-mono text-xs"
              style={{
                width: '100%',
                padding: '10px',
                marginTop: '4px',
                background: 'rgba(8, 14, 28, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#f8fafc',
                borderRadius: '4px',
                outline: 'none',
              }}
            >
              <option value="PARCEL_CREATED">PARCEL_CREATED</option>
              <option value="PARCEL_LOADED">PARCEL_LOADED</option>
              <option value="PARCEL_DELIVERED">PARCEL_DELIVERED</option>
              <option value="TRUCK_TELEMETRY_UPDATED">TRUCK_TELEMETRY_UPDATED</option>
              <option value="SCANNER_FAULT_DETECTED">SCANNER_FAULT_DETECTED</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="font-mono text-xs" style={{ color: '#94a3b8' }}>ENTITY ID</label>
              <input
                type="text"
                disabled={!apiClient.canInjectEvents()}
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                className="font-mono text-xs"
                style={{
                  width: '100%',
                  padding: '10px',
                  marginTop: '4px',
                  background: 'rgba(8, 14, 28, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#f8fafc',
                  borderRadius: '4px',
                  outline: 'none',
                }}
              />
            </div>
            <div>
              <label className="font-mono text-xs" style={{ color: '#94a3b8' }}>TRUCK BINDING</label>
              <input
                type="text"
                disabled={!apiClient.canInjectEvents()}
                value={truckId}
                onChange={(e) => setTruckId(e.target.value)}
                className="font-mono text-xs"
                style={{
                  width: '100%',
                  padding: '10px',
                  marginTop: '4px',
                  background: 'rgba(8, 14, 28, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#f8fafc',
                  borderRadius: '4px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div>
            <label className="font-mono text-xs" style={{ color: '#94a3b8' }}>EVENT SOURCE</label>
            <input
              type="text"
              disabled={!apiClient.canInjectEvents()}
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="font-mono text-xs"
              style={{
                width: '100%',
                padding: '10px',
                marginTop: '4px',
                background: 'rgba(8, 14, 28, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#f8fafc',
                borderRadius: '4px',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Submit */}
        <button
          className="cyber-btn"
          onClick={handleEmit}
          disabled={loading || !apiClient.canInjectEvents()}
          style={{
            padding: '12px',
            fontWeight: 700,
            justifyContent: 'center',
            background: apiClient.canInjectEvents()
              ? 'linear-gradient(135deg, #00f0ff 0%, #0284c7 100%)'
              : 'rgba(255, 255, 255, 0.08)',
            color: apiClient.canInjectEvents() ? '#040711' : '#94a3b8',
            cursor: apiClient.canInjectEvents() ? 'pointer' : 'not-allowed',
          }}
        >
          <Send size={15} />
          <span>
            {!apiClient.canInjectEvents()
              ? '🔒 INGESTION LOCKED (DISPATCHER/ADMIN REQUIRED)'
              : loading
              ? 'INGESTING TO STREAM...'
              : 'SUBMIT TO INGESTION PIPELINE'}
          </span>
        </button>

        {/* Output Feedback */}
        {result && (
          <div
            className="glass-card"
            style={{
              padding: '12px',
              borderLeft: `4px solid ${result.status === 'ACCEPTED' ? '#10b981' : '#ff3366'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="font-mono text-xs" style={{ fontWeight: 700, color: result.status === 'ACCEPTED' ? '#10b981' : '#ff3366' }}>
                {result.status === 'ACCEPTED' ? '✓ INGESTION SUCCESS (DUAL-COMMIT ATOMIC)' : '✗ INGESTION REJECTED'}
              </span>
              <span className="font-mono text-xs" style={{ color: '#94a3b8' }}>
                {result.dual_commit?.latency_ms || 1.2}ms
              </span>
            </div>
            <p className="text-xs" style={{ color: '#cbd5e1' }}>
              {result.message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

