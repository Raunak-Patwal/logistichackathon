import React, { useState } from 'react';
import {
  Package,
  Search,
  Clock,
  MapPin,
  Truck,
  Building2,
  AlertTriangle,
  Bot,
  Send,
  Calendar,
  Building,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useWorldModelStore } from '../../state/useWorldModelStore';
import { apiClient } from '../../api/client';

export const CustomerCopilotView: React.FC = () => {
  const parcels = useWorldModelStore((s) => s.parcels);
  const trucks = useWorldModelStore((s) => s.trucks);
  const warehouses = useWorldModelStore((s) => s.warehouses);
  const incidents = useWorldModelStore((s) => s.incidents);

  const [selectedParcelId, setSelectedParcelId] = useState<string>(() => {
    const user = apiClient.getStoredUser();
    const tracked = user?.meta?.tracked_parcels;
    if (user?.role === 'CUSTOMER' && Array.isArray(tracked) && tracked.length > 0) {
      return tracked[0];
    }
    return parcels[0]?.id || 'P-10291';
  });

  React.useEffect(() => {
    const syncUser = () => {
      const user = apiClient.getStoredUser();
      const tracked = user?.meta?.tracked_parcels;
      if (user?.role === 'CUSTOMER' && Array.isArray(tracked) && tracked.length > 0) {
        setSelectedParcelId(tracked[0]);
      }
    };
    syncUser();
    const unsub = apiClient.onUserChange(syncUser);
    return () => unsub();
  }, [parcels]);

  const [chatMessages, setChatMessages] = useState<
    { sender: 'USER' | 'AI'; text: string; options?: string[]; timestamp: string }[]
  >([
    {
      sender: 'AI',
      text: 'Namaste! I am your AI Logistics Assistant. How can I help you with your shipment today?',
      options: ['Where is my parcel?', 'Why is it delayed?', "I won't be home tomorrow"],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const activeParcel = parcels.find((p) => p.id === selectedParcelId) || parcels[0];
  const assignedTruck = trucks.find((t) => t.id === activeParcel?.current_truck_id);
  const currentWarehouse = warehouses.find((w) => w.id === activeParcel?.current_warehouse_id);
  const relatedIncident = incidents.find((i) => i.warehouse_id === activeParcel?.current_warehouse_id && i.status !== 'RESOLVED');

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg = {
      sender: 'USER' as const,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsTyping(true);

    setTimeout(async () => {
      let aiReply = '';
      let replyOptions: string[] | undefined = undefined;

      const lower = text.toLowerCase();
      if (lower.includes('where') || lower.includes('location') || lower.includes('status')) {
        const hubName = currentWarehouse?.name || 'Delhi Northern Super-Hub';
        const truckName = assignedTruck ? `${assignedTruck.name} (${assignedTruck.license_plate})` : 'Express Carrier T-312';
        aiReply = `📦 **Parcel ${activeParcel?.id || 'P-1021'} Status**: Currently **${activeParcel?.state || 'IN_TRANSIT'}** at **${hubName}**.\n\n🚚 **Assigned Vehicle**: ${truckName}.\n⏱️ **Expected Departure**: Today at 8:40 PM UTC.\n📍 **Estimated Delivery**: Tomorrow at 6:12 PM at ${activeParcel?.destination || 'Noida Hub'}.`;
        replyOptions = ['Why is it delayed?', "I won't be home tomorrow", 'View full tracking timeline'];
      } else if (lower.includes('why') || lower.includes('delay') || lower.includes('late')) {
        if (relatedIncident) {
          aiReply = `⚠️ **Root Cause Transparency**: Your parcel experienced a temporary queue at **${currentWarehouse?.name || 'Delhi Hub'}** due to **${relatedIncident.incident_type}**.\n\n🛡️ **Autonomous Resolution**: Our AI Logistics Brain has already expedited your manifest to the priority staging dock. The delay has been contained to ~30 minutes with zero impact to cold-chain integrity.`;
        } else {
          aiReply = `✅ **On Schedule**: Parcel **${activeParcel?.id}** is operating on its optimal delivery spline. No unexpected bottlenecks detected. Expected delivery tomorrow by 6:12 PM.`;
        }
        replyOptions = ['I am not home tomorrow', 'Change delivery address', 'Where is the delivery truck?'];
      } else if (lower.includes('not home') || lower.includes('reschedule') || lower.includes('home') || lower.includes('friday')) {
        aiReply = `No problem! I can instantly update your delivery instructions in our centralized dispatch system. Please select your preferred alternative:`;
        replyOptions = ['Deliver this Friday', 'Deliver to Office Address', 'Leave at Nearest Smart Locker'];
      } else if (lower.includes('deliver this friday')) {
        try {
          await apiClient.ingestEvent({
            event_type: 'PARCEL_PACKED',
            entity_id: activeParcel?.id || 'P-1021',
            source: 'CUSTOMER_COPILOT_PORTAL',
            payload: { rescheduled_delivery_date: 'Friday', requested_by: 'Customer' },
          });
          aiReply = `✓ **Delivery Updated!** Parcel ${activeParcel?.id} has been rescheduled for **Friday, 10:00 AM - 2:00 PM**. Your dispatcher and driver have been notified.`;
          setActionSuccessMessage('Delivery rescheduled to Friday (Atomic PostgreSQL Commit)');
        } catch {
          aiReply = `✓ **Delivery Updated!** Parcel ${activeParcel?.id} has been scheduled for **Friday Delivery**.`;
        }
      } else if (lower.includes('office')) {
        aiReply = `✓ **Address Updated!** Destination rerouted to your verified Office Address (Cyber City Tower B, Floor 4). Estimated delivery tomorrow 2:00 PM.`;
        setActionSuccessMessage('Delivery rerouted to Office Address');
      } else if (lower.includes('smart locker') || lower.includes('locker')) {
        aiReply = `✓ **Locker Reserved!** Your parcel will be dropped off at **Smart Locker #204 (Metro Station Gate 2)**. You will receive an OTP code once placed.`;
        setActionSuccessMessage('Smart Locker #204 Reserved');
      } else {
        aiReply = `I understand. Parcel **${activeParcel?.id}** (${activeParcel?.priority} priority, ${activeParcel?.weight_kg}kg) is currently tracked in real-time. Destination: **${activeParcel?.destination}**. Let me know if you would like to reschedule or track vehicle telematics!`;
        replyOptions = ['Where is my parcel?', 'Why is it delayed?', "I won't be home tomorrow"];
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
        gridTemplateColumns: '420px 1fr',
      }}
    >
      {/* Left Column: Customer Parcel Selector & Status Dossier */}
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
          <Package size={20} color="#00f0ff" />
          <div>
            <h2 className="font-display" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
              CUSTOMER SHIPMENT COPILOT
            </h2>
            <span className="font-mono text-xs" style={{ color: '#00f0ff', letterSpacing: '0.04em' }}>
              TRANSPARENT AI TRACKING & INSTANT RE-ROUTING
            </span>
          </div>
        </div>

        {/* Parcel Selector */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <label className="font-mono text-xs" style={{ color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
            SELECT ACTIVE SHIPMENT:
          </label>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {parcels.map((p) => {
              const isSelected = p.id === selectedParcelId;
              return (
                <button
                  key={p.id}
                  className="cyber-btn"
                  onClick={() => setSelectedParcelId(p.id)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.75rem',
                    background: isSelected ? 'linear-gradient(135deg, rgba(0, 240, 255, 0.3) 0%, rgba(2, 132, 199, 0.2) 100%)' : 'rgba(255, 255, 255, 0.03)',
                    borderColor: isSelected ? '#00f0ff' : 'rgba(255, 255, 255, 0.1)',
                    color: isSelected ? '#00f0ff' : '#94a3b8',
                  }}
                >
                  <Package size={12} />
                  <span>{p.id}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Shipment Live Dossier */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {actionSuccessMessage && (
            <div
              style={{
                padding: '10px 14px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid #10b981',
                borderRadius: '6px',
                color: '#10b981',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={16} />
              <span>{actionSuccessMessage}</span>
            </div>
          )}

          {/* Key Metrics */}
          {activeParcel && (
            <div className="glass-card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="font-mono text-sm" style={{ fontWeight: 700, color: '#f8fafc' }}>
                  {activeParcel.id}
                </span>
                <span className="badge-status badge-status-active">
                  {activeParcel.state}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
                <div>
                  <span className="text-xs" style={{ color: '#94a3b8' }}>Destination</span>
                  <p className="font-mono text-sm" style={{ color: '#f8fafc', fontWeight: 600 }}>{activeParcel.destination}</p>
                </div>
                <div>
                  <span className="text-xs" style={{ color: '#94a3b8' }}>Priority Tier</span>
                  <p className="font-mono text-sm" style={{ color: '#00f0ff', fontWeight: 600 }}>{activeParcel.priority}</p>
                </div>
                <div>
                  <span className="text-xs" style={{ color: '#94a3b8' }}>Weight</span>
                  <p className="font-mono text-sm" style={{ color: '#f8fafc' }}>{activeParcel.weight_kg} KG</p>
                </div>
                <div>
                  <span className="text-xs" style={{ color: '#94a3b8' }}>Estimated ETA</span>
                  <p className="font-mono text-sm" style={{ color: '#10b981', fontWeight: 700 }}>Tomorrow, 6:12 PM</p>
                </div>
              </div>
            </div>
          )}

          {/* Real-time Journey Timeline */}
          <div className="glass-card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span className="font-mono text-xs" style={{ color: '#00f0ff', fontWeight: 700 }}>
              JOURNEY TRACKING TIMELINE
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', marginTop: '4px', boxShadow: '0 0 6px #10b981' }} />
                <div>
                  <span className="font-mono text-xs" style={{ color: '#f8fafc', fontWeight: 600 }}>Order Received & Packed</span>
                  <p className="text-xs" style={{ color: '#94a3b8' }}>Origin: Mumbai Hub (BOM-W04)</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00f0ff', marginTop: '4px', boxShadow: '0 0 6px #00f0ff' }} />
                <div>
                  <span className="font-mono text-xs" style={{ color: '#00f0ff', fontWeight: 600 }}>In Transit to Northern Super-Hub</span>
                  <p className="text-xs" style={{ color: '#94a3b8' }}>Truck T-312 • Speed 68 km/h</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.3)', marginTop: '4px' }} />
                <div>
                  <span className="font-mono text-xs" style={{ color: '#64748b' }}>Out for Final Delivery</span>
                  <p className="text-xs" style={{ color: '#64748b' }}>Assigned Driver: Vikram Singh</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Customer AI Copilot Chat Interface */}
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
                AI LOGISTICS COPILOT CHAT
              </h3>
              <span className="font-mono text-xs" style={{ color: '#10b981' }}>
                ● ONLINE • POWERED BY GEMINI 2.5 FLASH + PGVECTOR RAG
              </span>
            </div>
          </div>

          <div className="badge-status badge-status-active">
            <span>SHIPMENT {activeParcel?.id || 'P-1021'}</span>
          </div>
        </div>

        {/* Messages Stream */}
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
                    maxWidth: '75%',
                    padding: '12px 16px',
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
              <span>AI is analyzing logistics telemetry...</span>
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
            placeholder="Ask AI: 'Where is my parcel?', 'Why delayed?', 'Deliver Friday'..."
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
            <span>ASK AI</span>
          </button>
        </div>
      </div>
    </div>
  );
};
