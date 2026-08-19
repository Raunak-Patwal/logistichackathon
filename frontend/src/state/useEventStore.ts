/**
 * Immutable Event Store & Live Ingestion Stream
 * Holds the historical record of events with correlation tracking.
 */

import { create } from 'zustand';
import { DomainEvent, EventType, EntityType } from '../domain/uleo';
import { INITIAL_EVENT_STREAM } from '../domain/mockData';

interface EventStoreState {
  events: DomainEvent[];
  activePulseEvent: DomainEvent | null;
  filterType: EventType | 'ALL';
  filterEntityType: EntityType | 'ALL';
  searchQuery: string;

  // Actions
  appendEvent: (event: DomainEvent) => void;
  addEvent: (event: DomainEvent) => void;
  triggerSpatialPulse: (event: DomainEvent) => void;
  clearSpatialPulse: () => void;
  setFilterType: (type: EventType | 'ALL') => void;
  setFilterEntityType: (type: EntityType | 'ALL') => void;
  setSearchQuery: (query: string) => void;
}

export const useEventStore = create<EventStoreState>((set) => ({
  events: INITIAL_EVENT_STREAM,
  activePulseEvent: null,
  filterType: 'ALL',
  filterEntityType: 'ALL',
  searchQuery: '',

  appendEvent: (event: DomainEvent) => {
    set((state) => ({
      events: [event, ...state.events],
      activePulseEvent: event,
    }));
  },

  addEvent: (event: DomainEvent) => {
    set((state) => ({
      events: [event, ...state.events],
      activePulseEvent: event,
    }));
  },

  triggerSpatialPulse: (event: DomainEvent) => {
    set({ activePulseEvent: event });
  },

  clearSpatialPulse: () => {
    set({ activePulseEvent: null });
  },

  setFilterType: (type) => set({ filterType: type }),
  setFilterEntityType: (type) => set({ filterEntityType: type }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
