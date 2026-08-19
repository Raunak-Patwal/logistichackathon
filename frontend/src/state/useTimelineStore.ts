/**
 * Timeline & Historical Time-Travel Replay Store
 */

import { create } from 'zustand';

export type PlaybackSpeed = 1 | 2 | 5 | 10;

interface TimelineState {
  currentTime: string; // ISO UTC or display string
  isPlaying: boolean;
  playbackSpeed: PlaybackSpeed;
  playheadProgress: number; // 0.0 to 1.0
  activeStepIndex: number;
  totalSteps: number;

  // Actions
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  setPlayheadProgress: (progress: number) => void;
  setActiveStepIndex: (index: number) => void;
  stepForward: () => void;
  stepBackward: () => void;
}

export const useTimelineStore = create<TimelineState>((set) => ({
  currentTime: '2026-08-17T17:42:04Z',
  isPlaying: false,
  playbackSpeed: 1,
  playheadProgress: 1.0,
  activeStepIndex: 4,
  totalSteps: 5,

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
  setPlayheadProgress: (playheadProgress) => set({ playheadProgress }),
  setActiveStepIndex: (activeStepIndex) => set({ activeStepIndex }),
  stepForward: () =>
    set((state) => ({
      activeStepIndex: Math.min(state.activeStepIndex + 1, state.totalSteps - 1),
    })),
  stepBackward: () =>
    set((state) => ({
      activeStepIndex: Math.max(state.activeStepIndex - 1, 0),
    })),
}));
