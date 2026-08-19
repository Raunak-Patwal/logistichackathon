import React, { useState } from 'react';
import {
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  DollarSign,
  PieChart,
  BarChart3,
  Bot,
  Send,
  Zap,
  Building2,
  Truck,
  Sparkles,
  Activity,
} from 'lucide-react';
import { useWorldModelStore } from '../../state/useWorldModelStore';

export const ExecutiveCopilotView: React.FC = () => {
  const telemetry = useWorldModelStore((s) => s.telemetry);
  const warehouses = useWorldModelStore((s) => s.warehouses);
  const trucks = useWorldModelStore((s) => s.trucks);
  const parcels = useWorldModelStore((s) => s.parcels);
  const incidents = useWorldModelStore((s) => s.incidents);

  const [chatMessages, setChatMessages] = useState<
    { sender: 'USER' | 'AI'; text: string; options?: string[]; timestamp: string }[]
  >([
    {
      sender: 'AI',
      text: 'Good day, Executive. I am your Strategic Supply Chain AI. The national network is currently operating at **92% operational efficiency** with **100% ACID data integrity**.',
      options: ['How healthy is the network?', 'What are our biggest cost risks?', 'Where should we add warehouse capacity?'],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const activeIncidents = incidents.filter((i) => i.status !== 'RESOLVED');

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMsg = {
      sender: 'USER' as const,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsTyping(true);

    setTimeout(() => {
      let aiReply = '';
      let replyOptions: string[] | undefined = undefined;

      const lower = text.toLowerCase();
      if (lower.includes('health') || lower.includes('overview') || lower.includes('status')) {
        aiReply = `📊 **Executive Network Health Assessment**:\n\n• **Overall Network Health Index**: **92 / 100** (Optimal)\n• **Active Hubs**: 5 Tier-1 Super-Hubs (${warehouses.filter((w) => w.status === 'OPTIMAL').length} Optimal)\n• **Fleet Fleet In-Transit**: ${trucks.length} Heavy Transports (Zero uncontained breakdowns)\n• **Throughput Velocity**: **${telemetry.events_per_sec} Events/Sec** at **${telemetry.processing_latency_ms}ms** latency\n• **Cold-Chain SLA Compliance**: **99.8%** On-Time Delivery`;
        replyOptions = ['What are our biggest cost risks?', 'Which hub is at highest capacity?', 'View carbon & fuel metrics'];
      } else if (lower.includes('cost') || lower.includes('risk') || lower.includes('financial') || lower.includes('penalty')) {
        aiReply = `💰 **Financial Risk & Cost Leakage Analysis**:\n\n1. **Delhi Northern Super-Hub (DEL-W12)**:\n   • Risk: Hardware scanner staging bottleneck\n   • Potential SLA Penalty: **$1,420**\n   • AI Mitigation: Autonomous dock load-shifting saved **$1,420** in SLA clawbacks.\n\n2. **Western Corridor (NH-48 Monsoon Front)**:\n   • Fuel Variance: **+8.4%** due to weather detours\n   • Net Savings: Autonomous bypass reduced idle truck idling hours by **3.2 hrs/day**.`;
        replyOptions = ['Where should we add warehouse capacity?', 'How healthy is the network?', 'Explain autonomous action ROI'];
      } else if (lower.includes('capacity') || lower.includes('expand') || lower.includes('warehouse') || lower.includes('invest')) {
        aiReply = `📈 **Strategic Capacity & Capital Allocation Recommendation**:\n\n• **Recommendation**: Commission an auxiliary 4,000-parcel cold-storage staging wing at **Mumbai Western Mega-Gateway (BOM-W04)**.\n• **Data Rationale**: BOM-W04 operates at **92% average capacity** during peak 18:00–22:00 window.\n• **Projected ROI**: Projected payback in **4.2 months** by capturing 28% more pharmaceutical cold-chain contracts.`;
        replyOptions = ['How healthy is the network?', 'What are our biggest cost risks?'];
      } else {
        aiReply = `Understood. Current supply chain telemetry across all 5 hubs shows **${parcels.length} active parcels** and **${trucks.length} vehicles** in synchronized transit. Let me know if you would like deep-dive diagnostics on cost, SLAs, or fleet utilization!`;
        replyOptions = ['How healthy is the network?', 'What are our biggest cost risks?', 'Where should we add warehouse capacity?'];
      }

      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'AI',
          text: aiReply,
          options: replyOptions,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <div
      className="persona-container"
      style={{
        gridTemplateColumns: '460px 1fr',
      }}
    >
      {/* Left Column: C-Suite KPI Dashboard & Cost Impact */}
      <div
        className="glass-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.9)',
          border: '1px solid rgba(0, 240, 255, 0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            background: 'linear-gradient(90deg, rgba(8, 14, 28, 0.95) 0%, rgba(4, 7, 17, 0.95) 100%)',
            borderBottom: '1px solid rgba(0, 240, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <TrendingUp size={20} color="#00f0ff" />
          <div>
            <h2 className="font-display" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
              EXECUTIVE C-SUITE COPILOT
            </h2>
            <span className="font-mono text-xs" style={{ color: '#00f0ff', letterSpacing: '0.04em' }}>
              MACRO NETWORK HEALTH & FINANCIAL RISK RADAR
            </span>
          </div>
        </div>

        {/* Macro Scorecard */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Health Score Pill */}
          <div
            className="glass-card"
            style={{
              padding: '16px',
              background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.12) 0%, rgba(16, 185, 129, 0.08) 100%)',
              border: '1px solid #00f0ff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <span className="font-mono text-xs" style={{ color: '#94a3b8' }}>OVERALL NETWORK HEALTH</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
                <span className="font-display" style={{ fontSize: '2rem', fontWeight: 700, color: '#f8fafc' }}>92</span>
                <span className="font-mono text-sm" style={{ color: '#10b981', fontWeight: 700 }}>/ 100 OPTIMAL</span>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span className="badge-status badge-status-success">
                ● 100% ACID CONSISTENCY
              </span>
              <span className="font-mono text-xs" style={{ color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                Zero Data Drift
              </span>
            </div>
          </div>

          {/* KPI Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="glass-card" style={{ padding: '12px' }}>
              <span className="text-xs" style={{ color: '#94a3b8' }}>Throughput Velocity</span>
              <p className="font-mono text-lg" style={{ color: '#00f0ff', fontWeight: 700, marginTop: '2px' }}>
                {telemetry.events_per_sec} EPS
              </p>
              <span className="text-xs" style={{ color: '#10b981' }}>+12% vs last week</span>
            </div>

            <div className="glass-card" style={{ padding: '12px' }}>
              <span className="text-xs" style={{ color: '#94a3b8' }}>Dual-Commit Latency</span>
              <p className="font-mono text-lg" style={{ color: '#a855f7', fontWeight: 700, marginTop: '2px' }}>
                {telemetry.processing_latency_ms} ms
              </p>
              <span className="text-xs" style={{ color: '#10b981' }}>Sub-millisecond peak</span>
            </div>

            <div className="glass-card" style={{ padding: '12px' }}>
              <span className="text-xs" style={{ color: '#94a3b8' }}>Active Bottlenecks</span>
              <p className="font-mono text-lg" style={{ color: activeIncidents.length > 0 ? '#ff3366' : '#10b981', fontWeight: 700, marginTop: '2px' }}>
                {activeIncidents.length} Incident
              </p>
              <span className="text-xs" style={{ color: '#94a3b8' }}>Auto-mitigated by AI</span>
            </div>

            <div className="glass-card" style={{ padding: '12px' }}>
              <span className="text-xs" style={{ color: '#94a3b8' }}>Cold-Chain SLA</span>
              <p className="font-mono text-lg" style={{ color: '#10b981', fontWeight: 700, marginTop: '2px' }}>
                99.8%
              </p>
              <span className="text-xs" style={{ color: '#10b981' }}>Zero spoilages</span>
            </div>
          </div>

          {/* Regional Hub Utilization Summary */}
          <div className="glass-card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span className="font-mono text-xs" style={{ color: '#00f0ff', fontWeight: 700 }}>
              REGIONAL SUPER-HUB UTILIZATION:
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {warehouses.map((w) => {
                const util = Math.round((w.current_parcels_count / w.capacity_parcels) * 100);
                const isHigh = util > 85;

                return (
                  <div key={w.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span style={{ color: '#f8fafc', fontWeight: 600 }}>{w.name.split(' ')[0]} ({w.code})</span>
                      <span className="font-mono" style={{ color: isHigh ? '#f59e0b' : '#10b981' }}>
                        {util}% ({w.current_parcels_count} / {w.capacity_parcels})
                      </span>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${util}%`,
                          background: isHigh ? 'linear-gradient(90deg, #f59e0b, #ff3366)' : '#00f0ff',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Strategic C-Suite AI Copilot Advisor */}
      <div
        className="glass-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.9)',
          border: '1px solid rgba(0, 240, 255, 0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Chat Header */}
        <div
          style={{
            padding: '16px 20px',
            background: 'linear-gradient(90deg, rgba(8, 14, 28, 0.95) 0%, rgba(4, 7, 17, 0.95) 100%)',
            borderBottom: '1px solid rgba(0, 240, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bot size={20} color="#00f0ff" />
            <div>
              <h3 className="font-display" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                STRATEGIC SUPPLY CHAIN ADVISOR
              </h3>
              <span className="font-mono text-xs" style={{ color: '#10b981' }}>
                ● C-SUITE REASONING AGENT • POSTGRES VECTOR EMBEDDINGS ACTIVE
              </span>
            </div>
          </div>

          <div className="badge-status badge-status-active">
            <span>EXECUTIVE BRIEFING</span>
          </div>
        </div>

        {/* Chat Messages Stream */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {chatMessages.map((msg, idx) => {
            const isUser = msg.sender === 'USER';
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isUser ? 'flex-end' : 'flex-start',
                  gap: '6px',
                }}
              >
                <div
                  style={{
                    maxWidth: '80%',
                    padding: '14px 18px',
                    borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    background: isUser
                      ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                      : 'rgba(15, 23, 42, 0.9)',
                    border: isUser ? 'none' : '1px solid rgba(0, 240, 255, 0.2)',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-line',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
                  }}
                >
                  {msg.text}
                </div>

                <span className="font-mono text-xs" style={{ color: '#64748b', padding: '0 4px' }}>
                  {msg.timestamp}
                </span>

                {/* Quick Action Suggestion Pills */}
                {msg.options && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                    {msg.options.map((opt, oIdx) => (
                      <button
                        key={oIdx}
                        className="cyber-btn"
                        onClick={() => handleSendMessage(opt)}
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.72rem',
                          borderColor: '#00f0ff',
                          color: '#00f0ff',
                        }}
                      >
                        <Sparkles size={11} />
                        <span>{opt}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {isTyping && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00f0ff', fontSize: '0.78rem' }}>
              <Bot size={16} />
              <span>AI is aggregating multi-hub financial data...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid rgba(0, 240, 255, 0.15)',
            background: 'rgba(8, 14, 28, 0.95)',
            display: 'flex',
            gap: '12px',
          }}
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputQuery)}
            placeholder="Ask AI: 'How healthy is my network?', 'What are our cost risks?', 'Capacity analysis'..."
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(0, 240, 255, 0.25)',
              color: '#f8fafc',
              fontSize: '0.85rem',
              outline: 'none',
            }}
          />
          <button
            className="cyber-btn"
            onClick={() => handleSendMessage(inputQuery)}
            style={{
              padding: '0 20px',
              background: 'linear-gradient(135deg, #00f0ff 0%, #0284c7 100%)',
              color: '#040711',
              fontWeight: 700,
            }}
          >
            <Send size={16} />
            <span>ADVISE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
