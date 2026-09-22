import * as Crypto from 'expo-crypto';
import { useMutation, type QueryKey, type UseMutationOptions } from '@tanstack/react-query';

import {
  clearDose,
  createMedication,
  deleteMedication,
  logDose,
  updateMedication,
} from '@/lib/mutations/medications';
import { medicationKeys, queryClient } from '@/lib/query-client';
import type { LogDoseInput, Medication, MedicationDose, MedicationInput, NewMedicationInput } from '@/lib/types';

// One queue for every medication write, for the same reason tasks have one:
// paused mutations replay strictly in submission order on reconnect, so a
// "taken" followed by an undo can't land reversed.
const MEDICATIONS_QUEUE_SCOPE = { id: 'medications-queue' } as const;

const DOSES_PREFIX = ['medications', 'doses'] as const;

function isUniqueViolation(err: unknown): boolean {
  return !!err && typeof err === 'object' && 'code' in err && (err as { code?: unknown }).code === '23505';
}

function deviceTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

export function buildNewMedicationInput(input: MedicationInput, ownerId: string): NewMedicationInput {
  return { id: Crypto.randomUUID(), ownerId, timeZone: deviceTimeZone(), ...input };
}

export function buildLogDoseInput(
  input: Pick<LogDoseInput, 'medicationId' | 'slotDate' | 'slotTime' | 'status'>,
  ownerId: string,
): LogDoseInput {
  return { id: Crypto.randomUUID(), ownerId, loggedAt: new Date().toISOString(), ...input };
}

type ListContext = { previousList?: Medication[] };

const createMedicationMutationOptions: UseMutationOptions<Medication, Error, NewMedicationInput, ListContext> = {
  mutationKey: ['medications', 'create'],
  scope: MEDICATIONS_QUEUE_SCOPE,
  mutationFn: createMedication,
  onMutate: async (input) => {
    await queryClient.cancelQueries({ queryKey: medicationKeys.list });
    const previousList = queryClient.getQueryData<Medication[]>(medicationKeys.list);
    const now = new Date().toISOString();
    const optimistic: Medication = {
      id: input.id,
      owner_id: input.ownerId,
      name: input.name.trim(),
      dose: input.dose?.trim() || null,
      instructions: input.instructions?.trim() || null,
      times: input.times,
      days_of_week: input.days_of_week,
      start_date: input.start_date,
      end_date: input.end_date,
      time_zone: input.timeZone,
      reminders_enabled: input.reminders_enabled,
      archived_at: null,
      shared_family_id: input.shared_family_id,
      created_at: now,
      updated_at: now,
      owner: null,
    };
    queryClient.setQueryData<Medication[]>(medicationKeys.list, (old) => [...(old ?? []), optimistic]);
    return { previousList };
  },
  onError: (error, _input, context) => {
    if (isUniqueViolation(error)) return; // already synced from a prior attempt
    if (context?.previousList !== undefined) queryClient.setQueryData(medicationKeys.list, context.previousList);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: medicationKeys.list });
  },
};

type UpdateVariables = { id: string } & Partial<MedicationInput> & { archived_at?: string | null };
type UpdateContext = ListContext & { previousDetail?: Medication | null; id: string };

const updateMedicationMutationOptions: UseMutationOptions<Medication, Error, UpdateVariables, UpdateContext> = {
  mutationKey: ['medications', 'update'],
  scope: MEDICATIONS_QUEUE_SCOPE,
  // Re-stamped on every save, so a schedule edited after moving time zones is
  // read on the clock it was written for.
  mutationFn: ({ id, ...input }) => updateMedication(id, { ...input, time_zone: deviceTimeZone() }),
  onMutate: async ({ id, ...input }) => {
    await Promise.all([
      queryClient.cancelQueries({ queryKey: medicationKeys.list }),
      queryClient.cancelQueries({ queryKey: medicationKeys.detail(id) }),
    ]);
    const previousList = queryClient.getQueryData<Medication[]>(medicationKeys.list);
    const previousDetail = queryClient.getQueryData<Medication | null>(medicationKeys.detail(id));
    const patch = (m: Medication): Medication => ({ ...m, ...input });
    queryClient.setQueryData<Medication[]>(medicationKeys.list, (old) =>
      // Archiving takes it off the list, as listMedications will.
      old?.flatMap((m) => (m.id !== id ? [m] : input.archived_at ? [] : [patch(m)])),
    );
    queryClient.setQueryData<Medication | null>(medicationKeys.detail(id), (old) => (old ? patch(old) : old));
    return { previousList, previousDetail, id };
  },
  onError: (_err, _vars, context) => {
    if (!context) return;
    if (context.previousList !== undefined) queryClient.setQueryData(medicationKeys.list, context.previousList);
    if (context.previousDetail !== undefined) {
      queryClient.setQueryData(medicationKeys.detail(context.id), context.previousDetail);
    }
  },
  onSettled: (_data, _err, { id }) => {
    queryClient.invalidateQueries({ queryKey: medicationKeys.list });
    queryClient.invalidateQueries({ queryKey: medicationKeys.detail(id) });
  },
};

const deleteMedicationMutationOptions: UseMutationOptions<void, Error, { id: string }, ListContext> = {
  mutationKey: ['medications', 'delete'],
  scope: MEDICATIONS_QUEUE_SCOPE,
  mutationFn: ({ id }) => deleteMedication(id),
  onMutate: async ({ id }) => {
    await queryClient.cancelQueries({ queryKey: medicationKeys.list });
    const previousList = queryClient.getQueryData<Medication[]>(medicationKeys.list);
    queryClient.setQueryData<Medication[]>(medicationKeys.list, (old) => old?.filter((m) => m.id !== id));
    return { previousList };
  },
  onError: (_err, _vars, context) => {
    if (context?.previousList !== undefined) queryClient.setQueryData(medicationKeys.list, context.previousList);
  },
  onSettled: (_data, _err, { id }) => {
    queryClient.invalidateQueries({ queryKey: medicationKeys.list });
    queryClient.invalidateQueries({ queryKey: DOSES_PREFIX });
    queryClient.removeQueries({ queryKey: medicationKeys.detail(id) });
  },
};

type DosesSnapshot = [QueryKey, MedicationDose[] | undefined][];

function sameSlot(dose: MedicationDose, medicationId: string, slotDate: string, slotTime: string): boolean {
  return dose.medication_id === medicationId && dose.slot_date === slotDate && dose.slot_time === slotTime;
}

async function snapshotDoses(): Promise<DosesSnapshot> {
  await queryClient.cancelQueries({ queryKey: DOSES_PREFIX });
  return queryClient.getQueriesData<MedicationDose[]>({ queryKey: DOSES_PREFIX });
}

function restoreDoses(snapshot: DosesSnapshot | undefined) {
  snapshot?.forEach(([key, data]) => queryClient.setQueryData(key, data));
}

const logDoseMutationOptions: UseMutationOptions<MedicationDose, Error, LogDoseInput, { snapshot: DosesSnapshot }> = {
  mutationKey: ['medications', 'logDose'],
  scope: MEDICATIONS_QUEUE_SCOPE,
  mutationFn: logDose,
  onMutate: async (input) => {
    const snapshot = await snapshotDoses();
    const optimistic: MedicationDose = {
      id: input.id,
      medication_id: input.medicationId,
      owner_id: input.ownerId,
      slot_date: input.slotDate,
      slot_time: input.slotTime,
      status: input.status,
      logged_at: input.loggedAt,
      created_at: input.loggedAt,
      updated_at: input.loggedAt,
    };
    // Every cached window that covers this day, whichever screen owns it.
    queryClient.setQueriesData<MedicationDose[]>({ queryKey: DOSES_PREFIX }, (old) => old && [
      ...old.filter((d) => !sameSlot(d, input.medicationId, input.slotDate, input.slotTime)),
      optimistic,
    ]);
    return { snapshot };
  },
  onError: (_err, _vars, context) => restoreDoses(context?.snapshot),
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: DOSES_PREFIX });
  },
};

type ClearDoseVariables = { medicationId: string; slotDate: string; slotTime: string };

const clearDoseMutationOptions: UseMutationOptions<void, Error, ClearDoseVariables, { snapshot: DosesSnapshot }> = {
  mutationKey: ['medications', 'clearDose'],
  scope: MEDICATIONS_QUEUE_SCOPE,
  mutationFn: ({ medicationId, slotDate, slotTime }) => clearDose(medicationId, slotDate, slotTime),
  onMutate: async ({ medicationId, slotDate, slotTime }) => {
    const snapshot = await snapshotDoses();
    queryClient.setQueriesData<MedicationDose[]>({ queryKey: DOSES_PREFIX }, (old) =>
      old?.filter((d) => !sameSlot(d, medicationId, slotDate, slotTime)),
    );
    return { snapshot };
  },
  onError: (_err, _vars, context) => restoreDoses(context?.snapshot),
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: DOSES_PREFIX });
  },
};

export const medicationMutationOptionsByKey = {
  create: createMedicationMutationOptions,
  update: updateMedicationMutationOptions,
  delete: deleteMedicationMutationOptions,
  logDose: logDoseMutationOptions,
  clearDose: clearDoseMutationOptions,
};

export function useCreateMedicationMutation() {
  return useMutation(createMedicationMutationOptions);
}
export function useUpdateMedicationMutation() {
  return useMutation(updateMedicationMutationOptions);
}
export function useDeleteMedicationMutation() {
  return useMutation(deleteMedicationMutationOptions);
}
export function useLogDoseMutation() {
  return useMutation(logDoseMutationOptions);
}
export function useClearDoseMutation() {
  return useMutation(clearDoseMutationOptions);
}
