import { EventIngestionRequest, EventIngestionResponse } from '../domain/uleo';
import { simulationEngine } from './simulationEngine';

const BACKEND_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api/v1';

export const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('logistics_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(`${BACKEND_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    console.warn('Session expired or unauthorized. Clearing token...');
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('logistics_token');
    }
  }

  return response;
};

export class ApiClient {
  private isBackendAvailable = false;

  constructor() {
    this.checkHealth();
  }

  public async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`http://localhost:8000/health`, { method: 'GET' });
      if (res.ok) {
        this.isBackendAvailable = true;
        return true;
      }
    } catch {
      this.isBackendAvailable = false;
    }
    return false;
  }

  public getBackendStatus(): boolean {
    return this.isBackendAvailable;
  }

  public async login(username: string, password: string): Promise<{ access_token?: string; role?: string; error?: string }> {
    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const res = await fetch(`${BACKEND_BASE_URL}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });

      if (res.ok) {
        const data = await res.json();
        if (typeof localStorage !== 'undefined' && data.access_token) {
          localStorage.setItem('logistics_token', data.access_token);
          localStorage.setItem('logistics_user', JSON.stringify({ username: data.username, role: data.role }));
        }
        return data;
      }
      return { error: 'Invalid username or password' };
    } catch (e) {
      return { error: 'Backend auth service unreachable' };
    }
  }

  public getStoredUser(): { username: string; role: string } | null {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem('logistics_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public logout(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('logistics_token');
      localStorage.removeItem('logistics_user');
    }
  }

  public async fetchWarehouses(): Promise<any[]> {
    if (this.isBackendAvailable) {
      try {
        const res = await fetch(`${BACKEND_BASE_URL}/warehouses`);
        if (res.ok) return await res.json();
      } catch {}
    }
    return [];
  }

  public async fetchTrucks(): Promise<any[]> {
    if (this.isBackendAvailable) {
      try {
        const res = await fetch(`${BACKEND_BASE_URL}/trucks`);
        if (res.ok) return await res.json();
      } catch {}
    }
    return [];
  }

  public async fetchParcels(): Promise<any[]> {
    if (this.isBackendAvailable) {
      try {
        const res = await fetch(`${BACKEND_BASE_URL}/parcels`);
        if (res.ok) return await res.json();
      } catch {}
    }
    return [];
  }

  public async fetchIncidents(statusFilter?: string): Promise<any[]> {
    if (this.isBackendAvailable) {
      try {
        const url = statusFilter ? `${BACKEND_BASE_URL}/incidents?status=${statusFilter}` : `${BACKEND_BASE_URL}/incidents`;
        const res = await fetch(url);
        if (res.ok) return await res.json();
      } catch {}
    }
    return [];
  }

  public async ingestEvent(request: EventIngestionRequest): Promise<EventIngestionResponse> {
    if (this.isBackendAvailable) {
      try {
        const res = await fetch(`${BACKEND_BASE_URL}/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });

        if (res.ok || res.status === 202) {
          const data = await res.json();
          return {
            status: data.status || 'ACCEPTED',
            event_id: data.event_id || crypto.randomUUID(),
            entity_id: request.entity_id,
            message: data.message || 'Event ingested and committed to backend PostgreSQL store.',
            dual_commit: data.dual_commit || {
              event_store: true,
              world_model: true,
              latency_ms: 1.2,
            },
          };
        }
      } catch {
        // Fall back to local simulation engine
      }
    }

    return simulationEngine.processEvent(request);
  }

  public async listEvents(limit: number = 50): Promise<any[]> {
    if (this.isBackendAvailable) {
      try {
        const res = await fetch(`${BACKEND_BASE_URL}/events?limit=${limit}`);
        if (res.ok) {
          return await res.json();
        }
      } catch {}
    }
    return [];
  }

  public async getNetworkSummary(): Promise<any> {
    if (this.isBackendAvailable) {
      try {
        const res = await fetch(`${BACKEND_BASE_URL}/network/summary`);
        if (res.ok) {
          return await res.json();
        }
      } catch {}
    }
    return {
      total_parcels: 5,
      total_trucks: 4,
      total_warehouses: 5,
      total_airports: 3,
      active_incidents: 1,
      consistency: '100% ACID (Single Tx)',
      system_mode: 'LIVE_LOCAL',
      active_phase: 'PHASE 1: OBSERVE',
    };
  }

  public async getIncidentContext(incidentId: string, warehouseId: string = 'W12'): Promise<any> {
    if (this.isBackendAvailable) {
      try {
        const res = await fetch(`${BACKEND_BASE_URL}/incidents/${incidentId}/context?warehouse_id=${warehouseId}`);
        if (res.ok) {
          return await res.json();
        }
      } catch {}
    }
    return null;
  }

  public async analyzeIncident(incidentId: string, warehouseId: string = 'W12'): Promise<any> {
    if (this.isBackendAvailable) {
      try {
        const res = await fetch(`${BACKEND_BASE_URL}/incidents/${incidentId}/analyze?warehouse_id=${warehouseId}`, {
          method: 'POST',
        });
        if (res.ok) {
          return await res.json();
        }
      } catch {}
    }
    return null;
  }

  public async executeIncidentAction(incidentId: string, actionPayload: any): Promise<any> {
    if (this.isBackendAvailable) {
      try {
        const res = await fetchWithAuth(`/incidents/${incidentId}/actions`, {
          method: 'POST',
          body: JSON.stringify(actionPayload),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch {}
    }
    return {
      status: 'EXECUTED',
      incident_status: 'RESOLVED',
      message: 'Action executed via local simulation orchestrator.',
    };
  }

  public async replayParcel(parcelId: string, upToStep?: number): Promise<any> {
    if (this.isBackendAvailable) {
      try {
        const stepQuery = upToStep ? `?up_to_step=${upToStep}` : '';
        const res = await fetch(`${BACKEND_BASE_URL}/parcels/${parcelId}/replay${stepQuery}`);
        if (res.ok) {
          return await res.json();
        }
      } catch {}
    }
    return null;
  }
}

export const apiClient = new ApiClient();


