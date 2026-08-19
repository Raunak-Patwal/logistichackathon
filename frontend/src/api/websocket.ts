import { useWorldStore } from '../store/useWorldStore';

let socket: WebSocket | null = null;

const getDefaultWsUrl = (): string => {
  if (typeof window === 'undefined') return 'ws://localhost:8000/api/v1/ws/events';
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname || 'localhost';
  return `${protocol}//${host}:8000/api/v1/ws/events`;
};

export const initializeWebSocket = (url: string = getDefaultWsUrl()) => {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  try {
    socket = new WebSocket(url);

    socket.onopen = () => {
      console.log('⚡ Connected to Logistics Real-Time WebSocket Gateway:', url);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📦 Real-time Event Received:', data);
        
        // Update Zustand World Model Store directly
        // This immediately triggers Three.js mesh color/pulse updates
        useWorldStore.getState().handleLiveEvent(data);
      } catch (err) {
        console.error('Failed to parse incoming WebSocket frame', err);
      }
    };

    socket.onclose = () => {
      console.warn('WebSocket connection closed. Reconnecting in 3s...');
      setTimeout(() => initializeWebSocket(url), 3000);
    };

    socket.onerror = (error) => {
      console.error('WebSocket Error:', error);
      socket?.close();
    };
  } catch (err) {
    console.error('Failed to initialize WebSocket client:', err);
  }
};
