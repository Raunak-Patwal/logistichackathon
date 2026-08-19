import React, { useState, useEffect } from 'react';
import {
  Activity,
  Search,
  ArrowUpRight,
  RefreshCw,
  Database,
} from 'lucide-react';
import { useEventStore } from '../../state/useEventStore';
import { useUIStore } from '../../state/useUIStore';
import { useWorldModelStore } from '../../state/useWorldModelStore';
import { DomainEvent } from '../../domain/uleo';
import { apiClient } from '../../api/client';

export const EventStreamView: React.FC = () => {
  const events = useEventStore((s) => s.events);
  const filterType = useEventStore((s) => s.filterType);
  const setFilterType = useEventStore((s) => s.setFilterType);
  const searchQuery = useEventStore((s) => s.searchQuery);
  const setSearchQuery = useEventStore((s) => s.setSearchQuery);

  const followEvent = useUIStore((s) => s.followEvent);
  const trucks = useWorldModelStore((s) => s.trucks);
  const warehouses = useWorldModelStore((s) => s.warehouses);

  const [selectedEventForJson, setSelectedEventForJson] = useState<DomainEvent | null>(null);
  const [loadingBackendEvents, setLoadingBackendEvents] = useState(false);

  const filteredEvents = events.filter((evt) => {
    if (filterType !== 'ALL' && evt.event_type !== filterType) return false;
    if (
      searchQuery &&
      !evt.entity_id.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !evt.event_type.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !evt.metadata.source.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const handleFollow = (event: DomainEvent) => {
    let pos: [number, number, number] | undefined = undefined;
    if (event.entity_type === 'TRUCK') {
      const tr = trucks.find((t) => t.id === event.entity_id);
      if (tr) pos = tr.position;
    } else if (event.entity_type === 'WAREHOUSE') {
      const wh = warehouses.find((w) => w.id === event.entity_id);
      if (wh) pos = wh.position;
    } else if (event.entity_type === 'PARCEL') {
      if (event.payload.truck_id) {
        const tr = trucks.find((t) => t.id === event.payload.truck_id);
        if (tr) pos = tr.position;
      } else if (event.payload.warehouse_id) {
        const wh = warehouses.find((w) => w.id === event.payload.warehouse_id);
        if (wh) pos = wh.position;
      }
    }
    followEvent(event, pos);
  };

  const handleFetchPostgreSQLLogs = async () => {
    setLoadingBackendEvents(true);
    try {
      const backendList = await apiClient.listEvents(50);
      if (backendList && backendList.length > 0) {
        backendList.forEach((e: any) => {
          useEventStore.getState().addEvent({
            event_type: e.event_type,
            entity_type: e.entity_type,
            entity_id: e.entity_id,
            payload: e.payload,
            metadata: {
              event_id: e.event_id,
              timestamp: e.created_at || new Date().toISOString(),
              source: e.source || 'POSTGRES_STORE',
            },
            version: 1,
          });
        });
      }
    } finally {
      setLoadingBackendEvents(false);
    }
  };

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
      {/* View Header */}
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
            <Activity size={18} color="#00f0ff" />
            <div>
              <h2 className="font-display" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                LIVE EVENT STREAM
              </h2>
              <span className="font-mono text-xs" style={{ color: '#00f0ff', letterSpacing: '0.04em' }}>
                ULEO v0.1 IMMUTABLE INGESTION LOG
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              className="cyber-btn"
              onClick={handleFetchPostgreSQLLogs}
              disabled={loadingBackendEvents}
              title="Sync latest records from PostgreSQL event_store"
              style={{ padding: '4px 8px', fontSize: '10px' }}
            >
              <Database size={11} color="#00f0ff" />
              <span>SYNC DB</span>
            </button>
            <div className="badge-status badge-status-active">
              <span className="status-dot status-dot-active" />
              <span>{filteredEvents.length}</span>
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
        </div>

        {/* Search and Filters */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <div
            style={{
              flex: 1,
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(0, 240, 255, 0.2)',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              padding: '0 8px',
              gap: '6px',
            }}
          >
            <Search size={13} color="#00f0ff" />
            <input
              type="text"
              placeholder="Search Entity ID, Event Type, Source..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#f8fafc',
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.78rem',
                outline: 'none',
                width: '100%',
                padding: '6px 0',
              }}
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="font-mono text-xs"
            style={{
              background: 'rgba(8, 14, 28, 0.95)',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              color: '#00f0ff',
              borderRadius: '4px',
              padding: '0 8px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">ALL TYPES</option>
            <option value="PARCEL_CREATED">PARCEL_CREATED</option>
            <option value="PARCEL_PACKED">PARCEL_PACKED</option>
            <option value="PARCEL_LOADED">PARCEL_LOADED</option>
            <option value="TRUCK_DEPARTED">TRUCK_DEPARTED</option>
            <option value="TRUCK_LOCATION_PING">TRUCK_LOCATION_PING</option>
            <option value="PARCEL_DELIVERED">PARCEL_DELIVERED</option>
          </select>
        </div>
      </div>

      {/* Events Stream List */}
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
        {filteredEvents.map((evt) => {
          let badgeClass = 'badge-status-active';
          if (evt.event_type === 'PARCEL_DELIVERED') badgeClass = 'badge-status-success';
          if (evt.event_type.includes('OFFLINE') || evt.event_type.includes('ALERT'))
            badgeClass = 'badge-status-critical';

          return (
            <div
              key={evt.metadata.event_id}
              className="glass-card"
              style={{
                padding: '10px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                border: selectedEventForJson?.metadata.event_id === evt.metadata.event_id
                  ? '1px solid #00f0ff'
                  : '1px solid rgba(255, 255, 255, 0.08)',
              }}
              onClick={() => setSelectedEventForJson(evt)}
            >
              {/* Event Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className={`badge-status ${badgeClass}`}>{evt.event_type}</span>
                  <span className="font-mono text-xs" style={{ color: '#f8fafc', fontWeight: 700 }}>
                    {evt.entity_id}
                  </span>
                </div>
                <span className="font-mono" style={{ fontSize: '0.68rem', color: '#64748b' }}>
                  {evt.metadata.timestamp.substring(11, 19)} UTC
                </span>
              </div>

              {/* Source & Metadata */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                <span style={{ color: '#94a3b8' }}>
                  Source: <span className="font-mono" style={{ color: '#00f0ff' }}>{evt.metadata.source}</span>
                </span>
                <button
                  className="cyber-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFollow(evt);
                  }}
                  style={{ padding: '2px 8px', fontSize: '0.68rem', color: '#00f0ff' }}
                  title="Follow this event in 3D world"
                >
                  <ArrowUpRight size={11} />
                  <span>3D TRACK</span>
                </button>
              </div>

              {/* Payload Snippet */}
              <div
                className="font-mono"
                style={{
                  fontSize: '0.68rem',
                  color: '#94a3b8',
                  backgroundColor: 'rgba(0, 0, 0, 0.4)',
                  padding: '4px 8px',
                  borderRadius: '3px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {JSON.stringify(evt.payload)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Expanded JSON Inspector Modal */}
      {selectedEventForJson && (
        <div
          style={{
            padding: '14px',
            borderTop: '1px solid rgba(0, 240, 255, 0.2)',
            background: 'rgba(4, 7, 17, 0.95)',
            maxHeight: '180px',
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span className="font-mono text-xs" style={{ color: '#00f0ff', fontWeight: 700 }}>
              ULEO CANONICAL PAYLOAD SCHEMA
            </span>
            <button
              onClick={() => setSelectedEventForJson(null)}
              className="cyber-btn"
              style={{ padding: '2px 6px', fontSize: '0.65rem' }}
            >
              CLOSE
            </button>
          </div>
          <pre
            className="font-mono"
            style={{
              fontSize: '0.68rem',
              color: '#38bdf8',
              lineHeight: 1.3,
            }}
          >
            {JSON.stringify(selectedEventForJson, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

