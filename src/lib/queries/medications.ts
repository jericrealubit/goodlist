import { supabase } from '@/lib/supabase';
import type { Medication, MedicationDose } from '@/lib/types';

const MEDICATION_SELECT = '*, owner:profiles!medications_owner_profile_fk(display_name)';

// RLS returns the caller's own medications plus any shared with them by a
// group-mate whose Premium is active; the screen splits the two by owner_id.
export async function listMedications(): Promise<Medication[]> {
  const { data, error } = await supabase
    .from('medications')
    .select(MEDICATION_SELECT)
    .is('archived_at', null)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getMedication(id: string): Promise<Medication | null> {
  const { data, error } = await supabase.from('medications').select(MEDICATION_SELECT).eq('id', id).maybeSingle();

  if (error) throw error;
  return data;
}

/** Dose rows on local days `from`…`to` inclusive (`YYYY-MM-DD`). */
export async function listDoses(from: string, to: string): Promise<MedicationDose[]> {
  const { data, error } = await supabase
    .from('medication_doses')
    .select('*')
    .gte('slot_date', from)
    .lte('slot_date', to)
    .order('slot_date', { ascending: true })
    .order('slot_time', { ascending: true });

  if (error) throw error;
  return data ?? [];
}
