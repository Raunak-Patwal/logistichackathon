import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  MarkerType,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useWorldModelStore } from '../../state/useWorldModelStore';
import { useUIStore } from '../../state/useUIStore';
import { Network, Building2, Truck, Package, Plane, AlertTriangle } from 'lucide-react';

export const NetworkGraphView: React.FC = () => {
  const warehouses = useWorldModelStore((s) => s.warehouses);
  const trucks = useWorldModelStore((s) => s.trucks);
  const parcels = useWorldModelStore((s) => s.parcels);
  const airports = useWorldModelStore((s) => s.airports);
  const incidents = useWorldModelStore((s) => s.incidents);

  const selectEntity = useUIStore((s) => s.selectEntity);
  const selectedId = useUIStore((s) => s.selectedEntityId);

  // Generate 2D Graph Nodes
  const nodes: Node[] = useMemo(() => {
    const generatedNodes: Node[] = [];

    // 1. Warehouses (Top Row)
    warehouses.forEach((w, i) => {
      generatedNodes.push({
        id: w.id,
        type: 'default',
        position: { x: i * 220 + 40, y: 80 },
        data: {
          label: (
            <div style={{ padding: '6px 10px', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                <Building2 size={13} color="#38bdf8" />
                <strong style={{ color: '#f8fafc', fontSize: '11px' }}>{w.code}</strong>
              </div>
              <div style={{ fontSize: '9px', color: '#94a3b8' }}>{w.current_parcels_count} parcels</div>
            </div>
          ),
        },
        style: {
          background: selectedId === w.id ? 'rgba(56, 189, 248, 0.25)' : 'rgba(15, 23, 42, 0.9)',
          border: `1px solid ${selectedId === w.id ? '#38bdf8' : 'rgba(56, 189, 248, 0.4)'}`,
          borderRadius: '6px',
          color: '#f8fafc',
          boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
          cursor: 'pointer',
        },
      });
    });

    // 2. Airports
    airports.forEach((a, i) => {
      generatedNodes.push({
        id: a.id,
        type: 'default',
        position: { x: i * 300 + 100, y: -40 },
        data: {
          label: (
            <div style={{ padding: '6px 10px', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plane size={13} color="#38bdf8" />
                <strong style={{ color: '#38bdf8', fontSize: '11px' }}>✈ {a.iata}</strong>
              </div>
            </div>
          ),
        },
        style: {
          background: 'rgba(15, 23, 42, 0.9)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: '6px',
          color: '#f8fafc',
          cursor: 'pointer',
        },
      });
    });

    // 3. Active Trucks (Middle Row)
    trucks.forEach((t, i) => {
      generatedNodes.push({
        id: t.id,
        type: 'default',
        position: { x: (i % 4) * 260 + 60, y: 240 + Math.floor(i / 4) * 120 },
        data: {
          label: (
            <div style={{ padding: '6px 10px', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                <Truck size={13} color="#38bdf8" />
                <strong style={{ color: '#f8fafc', fontSize: '11px' }}>{t.id}</strong>
              </div>
              <div style={{ fontSize: '9px', color: '#94a3b8' }}>
                {t.status} • {t.parcel_ids.length} parcels
              </div>
            </div>
          ),
        },
        style: {
          background: selectedId === t.id ? 'rgba(56, 189, 248, 0.25)' : 'rgba(20, 29, 48, 0.9)',
          border: `1px solid ${selectedId === t.id ? '#38bdf8' : 'rgba(255, 255, 255, 0.15)'}`,
          borderRadius: '6px',
          color: '#f8fafc',
          cursor: 'pointer',
        },
      });
    });

    // 4. Incidents
    incidents.forEach((inc, i) => {
      generatedNodes.push({
        id: inc.id,
        type: 'default',
        position: { x: i * 260 + 80, y: 480 },
        data: {
          label: (
            <div style={{ padding: '6px 10px', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={13} color="#ef4444" />
                <strong style={{ color: '#ef4444', fontSize: '11px' }}>{inc.id}</strong>
              </div>
              <div style={{ fontSize: '9px', color: '#f87171' }}>{inc.incident_type}</div>
            </div>
          ),
        },
        style: {
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid #ef4444',
          borderRadius: '6px',
          color: '#f8fafc',
          cursor: 'pointer',
        },
      });
    });

    return generatedNodes;
  }, [warehouses, trucks, airports, incidents, selectedId]);

  // Generate 2D Edges
  const edges: Edge[] = useMemo(() => {
    const generatedEdges: Edge[] = [];

    // Trucks -> Warehouses
    trucks.forEach((t) => {
      if (t.origin_id) {
        generatedEdges.push({
          id: `edge-${t.id}-${t.origin_id}`,
          source: t.origin_id,
          target: t.id,
          animated: t.status === 'IN_TRANSIT',
          style: { stroke: '#38bdf8', strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#38bdf8' },
        });
      }
      if (t.destination_id && t.destination_id !== t.origin_id) {
        generatedEdges.push({
          id: `edge-${t.id}-${t.destination_id}`,
          source: t.id,
          target: t.destination_id,
          animated: t.status === 'IN_TRANSIT',
          style: { stroke: '#0284c7', strokeDasharray: '4 4' },
        });
      }
    });

    // Incidents -> Warehouses
    incidents.forEach((inc) => {
      generatedEdges.push({
        id: `edge-${inc.id}-${inc.warehouse_id}`,
        source: inc.warehouse_id,
        target: inc.id,
        style: { stroke: '#ef4444', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
      });
    });

    return generatedEdges;
  }, [trucks, incidents]);

  return (
    <div
      className="tactical-panel"
      style={{
        position: 'absolute',
        top: 'calc(var(--telemetry-bar-height) + 16px)',
        left: 'calc(var(--nav-rail-width) + 16px)',
        bottom: '16px',
        width: '640px',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--border-default)',
          background: 'rgba(10, 14, 22, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Network size={16} color="#38bdf8" />
          <div>
            <h2 className="font-display" style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
              2D TOPOLOGY & RELATIONSHIP GRAPH
            </h2>
            <span className="font-mono text-xs" style={{ color: '#38bdf8' }}>
              RELATIONAL DEPENDENCY MATRIX (REACT FLOW)
            </span>
          </div>
        </div>

        <div className="badge-status badge-status-active">
          <span>{nodes.length} NODES • {edges.length} RELATIONS</span>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={(_, node) => {
            if (node.id.startsWith('W')) selectEntity('WAREHOUSE', node.id);
            else if (node.id.startsWith('T-')) selectEntity('TRUCK', node.id);
            else if (node.id.startsWith('AIR-')) selectEntity('AIRPORT', node.id);
            else if (node.id.startsWith('INC-')) selectEntity('INCIDENT', node.id);
          }}
          fitView
          style={{ background: '#07090e' }}
        >
          <Background color="#1e293b" gap={20} size={1} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
};
