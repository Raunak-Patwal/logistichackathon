import React from 'react';
import {
  Clock,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  FastForward,
  Layers,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useTimelineStore } from '../../state/useTimelineStore';
import { useEventStore } from '../../state/useEventStore';
import { useUIStore } from '../../state/useUIStore';

export const TimelineView: React.FC = () => {
  const isPlaying = useTimelineStore((s) => s.isPlaying);
  const togglePlay = useTimelineStore((s) => s.togglePlay);
  const playbackSpeed = useTimelineStore((s) => s.playbackSpeed);
  const setPlaybackSpeed = useTimelineStore((s) => s.setPlaybackSpeed);
  const activeStepIndex = useTimelineStore((s) => s.activeStepIndex);
  const setActiveStepIndex = useTimelineStore((s) => s.setActiveStepIndex);
  const stepForward = useTimelineStore((s) => s.stepForward);
  const stepBackward = useTimelineStore((s) => s.stepBackward);

  const events = useEventStore((s) => s.events);
  const followEvent = useUIStore((s) => s.followEvent);

  return (
    <div
      className="tactical-panel"
      style={{
        position: 'absolute',
        top: 'calc(var(--telemetry-bar-height) + 16px)',
        left: 'calc(var(--nav-rail-width) + 16px)',
        bottom: '16px',
        width: '520px',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--border-default)',
          background: 'rgba(10, 14, 22, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} color="#38bdf8" />
            <div>
              <h2 className="font-display" style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                HISTORICAL TIME TRAVEL & EVENT REPLAY
              </h2>
              <span className="font-mono text-xs" style={{ color: '#38bdf8' }}>
                IMMUTABLE AUDIT LOG STATE RECONSTRUCTION
              </span>
            </div>
          </div>

          <div className="badge-status badge-status-active">
            <span>REPLAY READY</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-xs)',
            border: '1px solid var(--border-default)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button className="tactical-btn" onClick={stepBackward} title="Previous Step">
              <SkipBack size={12} />
            </button>
            <button
              className="tactical-btn tactical-btn-primary"
              onClick={togglePlay}
              title={isPlaying ? 'Pause Replay' : 'Play Replay'}
            >
              {isPlaying ? <Pause size={12} /> : <Play size={12} />}
              <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
            </button>
            <button className="tactical-btn" onClick={stepForward} title="Next Step">
              <SkipForward size={12} />
            </button>
          </div>

          {/* Speed Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>SPEED:</span>
            {([1, 2, 5, 10] as const).map((spd) => (
              <button
                key={spd}
                className="tactical-btn"
                onClick={() => setPlaybackSpeed(spd)}
                style={{
                  padding: '2px 6px',
                  fontSize: '0.68rem',
                  fontFamily: 'var(--font-mono)',
                  borderColor: playbackSpeed === spd ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                  color: playbackSpeed === spd ? '#38bdf8' : 'var(--text-muted)',
                }}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chronological Step List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
          CHRONOLOGICAL EVENT LOG & STATE RECONSTRUCTION
        </span>

        {events.map((evt, idx) => {
          const isSelectedStep = idx === activeStepIndex;

          return (
            <div
              key={evt.metadata.event_id}
              className="tactical-panel-solid"
              onClick={() => {
                setActiveStepIndex(idx);
                followEvent(evt);
              }}
              style={{
                padding: '12px',
                borderLeft: isSelectedStep ? '3px solid var(--accent-cyan)' : '3px solid var(--border-default)',
                background: isSelectedStep ? 'rgba(56, 189, 248, 0.08)' : 'var(--bg-surface-solid)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                transition: 'all var(--transition-fast)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    className="font-mono text-xs"
                    style={{
                      padding: '2px 6px',
                      borderRadius: '3px',
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      color: isSelectedStep ? '#38bdf8' : '#94a3b8',
                    }}
                  >
                    STEP #{events.length - idx}
                  </span>
                  <span className="font-mono text-xs" style={{ color: '#f8fafc', fontWeight: 600 }}>
                    {evt.event_type}
                  </span>
                </div>
                <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                  {evt.metadata.timestamp.substring(11, 19)} UTC
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Target Entity: <span className="font-mono" style={{ color: '#38bdf8' }}>{evt.entity_id}</span>
                </span>
                <span style={{ color: 'var(--text-muted)' }}>
                  Source: <span className="font-mono">{evt.metadata.source}</span>
                </span>
              </div>

              {isSelectedStep && (
                <div
                  style={{
                    marginTop: '4px',
                    padding: '6px 8px',
                    background: 'rgba(0, 0, 0, 0.4)',
                    borderRadius: '3px',
                    border: '1px dashed rgba(56, 189, 248, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <ShieldCheck size={12} color="#10b981" />
                  <span className="font-mono text-xs" style={{ color: '#10b981' }}>
                    WORLD MODEL RECONSTRUCTED TO THIS TIMESTAMP
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
