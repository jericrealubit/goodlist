import { QueryClient } from '@tanstack/react-query';

export const taskKeys = {
  open: ['tasks', 'open'] as const,
  history: ['tasks', 'history'] as const,
  detail: (id: string) => ['tasks', 'detail', id] as const,
};

export const groupKeys = {
  mine: ['group', 'mine'] as const,
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
