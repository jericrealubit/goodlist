import { supabase } from '@/lib/supabase';
import type { LogDoseInput, Medication, MedicationDose, MedicationInput, NewMedicationInput } from '@/lib/types';

function clean(value: string | null): string | null {
  return value?.trim() || null;
}

// Like tasks, the id is generated client-side so the optimistic row IS the
// final row and a queued offline create needs no reconciliation.
export async function createMedication(input: NewMedicationInput): Promise<Medication> {
  const { data, error } = await supabase
    .from('medications')
    .insert({
      id: input.id,
      owner_id: input.ownerId,
      name: input.name.trim(),
      dose: clean(input.dose),
      instructions: clean(input.instructions),
      times: input.times,
      days_of_week: input.days_of_week,
      start_date: input.start_date,
      end_date: input.end_date,
      time_zone: input.timeZone,
      reminders_enabled: input.reminders_enabled,
      shared_family_id: input.shared_family_id,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateMedication(
  id: string,
  input: Partial<MedicationInput> & { time_zone?: string | null; archived_at?: string | null },
): Promise<Medication> {
  const { data, error } = await supabase
    .from('medications')
    .update({
      ...input,
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.dose !== undefined ? { dose: clean(input.dose) } : {}),
      ...(input.instructions !== undefined ? { instructions: clean(input.instructions) } : {}),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMedication(id: string): Promise<void> {
  const { error } = await supabase.from('medications').delete().eq('id', id);
  if (error) throw error;
}

// An upsert on the slot, not an insert: a dose logged from a notification and
// again from the app — or replayed from the offline queue — is one answer, and
// changing your mind (skipped → taken) just overwrites it.
export async function logDose(input: LogDoseInput): Promise<MedicationDose> {
  const { data, error } = await supabase
    .from('medication_doses')
    .upsert(
      {
        // No id: on a conflict it would overwrite the existing row's key.
        medication_id: input.medicationId,
        owner_id: input.ownerId,
        slot_date: input.slotDate,
        slot_time: input.slotTime,
        status: input.status,
        logged_at: input.loggedAt,
      },
      { onConflict: 'medication_id,slot_date,slot_time', ignoreDuplicates: false },
    )
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function clearDose(medicationId: string, slotDate: string, slotTime: string): Promise<void> {
  const { error } = await supabase
    .from('medication_doses')
    .delete()
    .eq('medication_id', medicationId)
    .eq('slot_date', slotDate)
    .eq('slot_time', slotTime);
  if (error) throw error;
}
