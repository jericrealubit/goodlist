import { QueryClient } from '@tanstack/react-query';

export const taskKeys = {
  open: ['tasks', 'open'] as const,
  history: ['tasks', 'history'] as const,
  detail: (id: string) => ['tasks', 'detail', id] as const,
  // Under the 'tasks' prefix on purpose: realtime task changes invalidate
  // ['tasks'] wholesale, and deleting an occurrence changes its series
  // (skipped_dates, via a trigger) — so the series refreshes along with it.
  recurrences: ['tasks', 'recurrences'] as const,
};

// Everything under one prefix, which useRealtimeMedications invalidates wholesale.
export const medicationKeys = {
  all: ['medications'] as const,
  list: ['medications', 'list'] as const,
  detail: (id: string) => ['medications', 'detail', id] as const,
  doses: (from: string, to: string) => ['medications', 'doses', from, to] as const,
};

export const groupKeys = {
  mine: ['group', 'mine'] as const,
};

export const premiumKeys = {
  mine: ['premium', 'mine'] as const,
  plans: ['premium', 'plans'] as const,
};

export const notificationKeys = {
  unreadCount: ['notifications', 'unreadCount'] as const,
};

export const profileKeys = {
  mine: ['profile', 'me'] as const,
};

export const statsKeys = {
  users: ['stats', 'users'] as const,
};

export const distributionKeys = {
  report: ['distribution', 'report'] as const,
  isAdmin: ['distribution', 'isAdmin'] as const,
};

export const systemStatusKeys = {
  current: ['system-status', 'current'] as const,
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days — survive long offline stretches
    },
    mutations: {
      retry: 0,
    },
  },
});
