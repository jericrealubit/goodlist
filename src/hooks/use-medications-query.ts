import { useQuery } from '@tanstack/react-query';

import { medicationKeys } from '@/lib/query-client';
import { getMedication, listDoses, listMedications } from '@/lib/queries/medications';

export function useMedicationsQuery() {
  return useQuery({ queryKey: medicationKeys.list, queryFn: listMedications });
}

export function useMedicationDetailQuery(id: string) {
  return useQuery({ queryKey: medicationKeys.detail(id), queryFn: () => getMedication(id), enabled: !!id });
}

/** Dose rows on local days `from`…`to` inclusive. */
export function useDosesQuery(from: string, to: string, enabled = true) {
  return useQuery({ queryKey: medicationKeys.doses(from, to), queryFn: () => listDoses(from, to), enabled });
}
