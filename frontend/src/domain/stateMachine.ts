/**
 * Parcel Lifecycle State Machine & Domain Invariant Verification
 * Reflects src/domain/parcel/aggregate.py rules in pure TypeScript.
 */

import { ParcelState } from './worldModel';
import { EventType } from './uleo';

export interface StateTransitionResult {
  valid: boolean;
  next_state?: ParcelState;
  error?: string;
  rule_violated?: string;
}

// Legal State Transitions Map
export const LEGAL_TRANSITIONS: Record<ParcelState, { next: ParcelState[]; required_event: EventType }> = {
  CREATED: { next: ['PACKED'], required_event: 'PARCEL_PACKED' },
  PACKED: { next: ['LOADED'], required_event: 'PARCEL_LOADED' },
  LOADED: { next: ['DISPATCHED'], required_event: 'TRUCK_DEPARTED' },
  DISPATCHED: { next: ['DELIVERED'], required_event: 'PARCEL_DELIVERED' },
  DELIVERED: { next: [], required_event: 'PARCEL_DELIVERED' },
};

export const STATE_FLOW_ORDER: ParcelState[] = ['CREATED', 'PACKED', 'LOADED', 'DISPATCHED', 'DELIVERED'];

/**
 * Validates whether transitioning a parcel from `currentState` using `eventType` is legal.
 */
export function validateStateTransition(
  currentState: ParcelState | null | undefined,
  eventType: EventType
): StateTransitionResult {
  if (!currentState) {
    if (eventType === 'PARCEL_CREATED') {
      return { valid: true, next_state: 'CREATED' };
    }
    return {
      valid: false,
      error: `Cannot process ${eventType} on uncreated parcel. Must begin with PARCEL_CREATED.`,
      rule_violated: 'INVARIANT: Parcel must be created before receiving lifecycle events.',
    };
  }

  if (eventType === 'PARCEL_CREATED') {
    return {
      valid: false,
      error: `Parcel already exists in state ${currentState}. Cannot create duplicate parcel.`,
      rule_violated: 'INVARIANT: Parcel ID uniqueness & lifecycle initialization.',
    };
  }

  if (eventType === 'PARCEL_PACKED') {
    if (currentState === 'CREATED') {
      return { valid: true, next_state: 'PACKED' };
    }
    return {
      valid: false,
      error: `Cannot pack parcel in state ${currentState}. Expected CREATED.`,
      rule_violated: 'INVARIANT: Only CREATED parcels can transition to PACKED.',
    };
  }

  if (eventType === 'PARCEL_LOADED') {
    if (currentState === 'PACKED') {
      return { valid: true, next_state: 'LOADED' };
    }
    return {
      valid: false,
      error: `Cannot load parcel in state ${currentState}. Expected PACKED.`,
      rule_violated: 'INVARIANT: Parcel must be packed and inspected before loading into truck.',
    };
  }

  if (eventType === 'TRUCK_DEPARTED') {
    if (currentState === 'LOADED') {
      return { valid: true, next_state: 'DISPATCHED' };
    }
    return {
      valid: false,
      error: `Cannot dispatch parcel in state ${currentState}. Expected LOADED.`,
      rule_violated: 'INVARIANT: Parcel must be loaded on a truck before dispatch.',
    };
  }

  if (eventType === 'PARCEL_DELIVERED') {
    if (currentState === 'DISPATCHED') {
      return { valid: true, next_state: 'DELIVERED' };
    }
    return {
      valid: false,
      error: `Cannot deliver parcel in state ${currentState}. Expected DISPATCHED.`,
      rule_violated: 'INVARIANT: Parcel cannot jump directly to DELIVERED without being in transit.',
    };
  }

  // Non-lifecycle telemetry events
  return { valid: true, next_state: currentState };
}
