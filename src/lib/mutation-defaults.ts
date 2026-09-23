import type { QueryClient, UseMutationOptions } from '@tanstack/react-query';

import { medicationMutationOptionsByKey } from '@/hooks/use-medication-mutations';
import { markAllReadMutationOptions } from '@/hooks/use-notifications-mutations';
import {
  syncDeviceLocaleMutationOptions,
  updateDisplayNameMutationOptions,
  updateLocaleSharingMutationOptions,
} from '@/hooks/use-profile-mutations';
import { taskMutationOptionsByKey } from '@/hooks/use-task-mutations';
import { taskRecurrenceMutationOptionsByKey } from '@/hooks/use-task-recurrences';

function register<TData, TError, TVariables, TContext>(
  queryClient: QueryClient,
  options: UseMutationOptions<TData, TError, TVariables, TContext>,
) {
  if (options.mutationKey) {
    queryClient.setMutationDefaults(options.mutationKey, options);
  }
}

// A mutation rehydrated from persisted storage loses its original
// closure-bound mutationFn/callbacks — it can only be resumed if a matching
// mutationKey has defaults registered here to fall back on. Call once at app
// init, before PersistQueryClientProvider's onSuccess calls
// resumePausedMutations(). Registered one call per entry (rather than looped
// over Object.values) so each keeps its own independent generic
// instantiation instead of collapsing to an incompatible union type.
export function registerMutationDefaults(queryClient: QueryClient) {
  register(queryClient, taskMutationOptionsByKey.create);
  register(queryClient, taskMutationOptionsByKey.createRequest);
  register(queryClient, taskMutationOptionsByKey.update);
  register(queryClient, taskMutationOptionsByKey.complete);
  register(queryClient, taskMutationOptionsByKey.reopen);
  register(queryClient, taskMutationOptionsByKey.cancel);
  register(queryClient, taskMutationOptionsByKey.delete);
  register(queryClient, taskMutationOptionsByKey.deleteAllHistory);
  register(queryClient, taskMutationOptionsByKey.reorder);
  register(queryClient, taskRecurrenceMutationOptionsByKey.create);
  register(queryClient, taskRecurrenceMutationOptionsByKey.update);
  register(queryClient, taskRecurrenceMutationOptionsByKey.stop);
  register(queryClient, updateDisplayNameMutationOptions);
  register(queryClient, syncDeviceLocaleMutationOptions);
  register(queryClient, updateLocaleSharingMutationOptions);
  register(queryClient, markAllReadMutationOptions);
  register(queryClient, medicationMutationOptionsByKey.create);
  register(queryClient, medicationMutationOptionsByKey.update);
  register(queryClient, medicationMutationOptionsByKey.delete);
  register(queryClient, medicationMutationOptionsByKey.logDose);
  register(queryClient, medicationMutationOptionsByKey.clearDose);
}
