import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { AdherenceBar } from '@/components/adherence-bar';
import { EmptyState } from '@/components/empty-state';
import { describeSchedule, formatSlotTime, STATUS_LABEL } from '@/components/meds/dose-format';
import { ReminderStatusBanner } from '@/components/meds/reminder-status-banner';
import { PrimaryButton } from '@/components/primary-button';
import { PulseDot } from '@/components/pulse-dot';
import { RoundActionButton } from '@/components/round-action-button';
import { SlotRowSkeleton } from '@/components/skeleton';
import { Surface } from '@/components/surface';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Toast } from '@/components/toast';
import { ActionIcons, type IconName } from '@/constants/icons';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSession } from '@/contexts/session-context';
import {
  buildLogDoseInput,
  useClearDoseMutation,
  useLogDoseMutation,
} from '@/hooks/use-medication-mutations';
import { useDosesQuery, useMedicationsQuery } from '@/hooks/use-medications-query';
import { useRealtimeMedications } from '@/hooks/use-realtime-medications';
import { useTheme } from '@/hooks/use-theme';
import { useTokens } from '@/hooks/use-tokens';
import { addDays, toDayKey } from '@/lib/calendar/day';
import { adherence, indexDoses, slotKey, slotStatus, type SlotStatus } from '@/lib/medications/adherence';
import { slotsForDayAll, type Slot } from '@/lib/medications/schedule';
import { getErrorMessage } from '@/lib/errors';
import { tapLight, tapWarning } from '@/lib/haptics';
import type { DoseStatus, Medication, MedicationDose } from '@/lib/types';

/** The window of dose rows kept in cache: enough for a 30-day adherence figure. */
const HISTORY_DAYS = 30;
/** The figure shown on each medicine's row. */
const ADHERENCE_DAYS = 7;
/** Slot statuses change on the minute; nothing on this screen needs finer. */
const CLOCK_TICK_MS = 60_000;

/**
 * Render can't read the clock (the React Compiler rules), so hold a reading in
 * state and refresh it each minute — that is what moves a slot from "due" to
 * "missed", and rolls "today" over at midnight.
 */
function useMinuteClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), CLOCK_TICK_MS);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/** Status rides a mark beside the text, never the text colour — the stat-tile rule. */
function StatusMark({ status }: { status: SlotStatus }) {
  const theme = useTheme();
  const tokens = useTokens();
  const ring = Math.max(tokens.cardBorderWidth, 2);

  // Only a dose that's due right now breathes — it's the one status asking
  // for attention. Every other status stays the plain static mark it always
  // was, so a long list of taken/missed/upcoming rows never mounts a
  // shared value it doesn't need.
  if (status === 'due') {
    return (
      <PulseDot
        color={theme.primary}
        size={14}
        variant="ring"
        borderWidth={ring}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    );
  }

  const fill =
    status === 'taken' ? theme.primary : status === 'missed' ? theme.danger : status === 'skipped' ? theme.textSecondary : 'transparent';
  const border = status === 'upcoming' ? theme.border : fill;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[styles.mark, { backgroundColor: fill, borderColor: border, borderWidth: ring }]}
    />
  );
}

function DoseButton({
  label,
  icon,
  onPress,
  accessibilityLabel,
  primary,
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  primary?: boolean;
}) {
  const theme = useTheme();
  const tokens = useTokens();
  const color = primary ? '#ffffff' : theme.text;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.doseButton,
        {
          backgroundColor: primary ? theme.primary : theme.background,
          borderColor: theme.border,
          borderWidth: primary ? 0 : tokens.borderWidth,
          borderRadius: tokens.radii.pill,
          opacity: pressed ? 0.7 : 1,
        },
      ]}>
      <Ionicons name={icon} size={16} color={color} />
      <ThemedText type="smallBold" style={{ color }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

type SlotRowProps = {
  slot: Slot;
  med: Medication;
  status: SlotStatus;
  /** Absent for someone else's medicine: caregivers see, they don't log. */
  onLog?: (status: DoseStatus) => void;
  onUndo?: () => void;
};

function SlotRow({ slot, med, status, onLog, onUndo }: SlotRowProps) {
  const time = formatSlotTime(slot.time);
  const logged = status === 'taken' || status === 'skipped';
  return (
    <Surface style={styles.slotRow}>
      <StatusMark status={status} />
      <View style={styles.slotText}>
        <ThemedText type="smallBold">
          {time} · {med.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {[med.dose, STATUS_LABEL[status]].filter(Boolean).join(' · ')}
        </ThemedText>
      </View>
      {onLog && !logged ? (
        <View style={styles.slotActions}>
          <DoseButton
            label="Skip"
            icon={ActionIcons.skipDose}
            onPress={() => onLog('skipped')}
            accessibilityLabel={`Skip ${med.name} at ${time}`}
          />
          <DoseButton
            label="Taken"
            icon={ActionIcons.confirm}
            primary
            onPress={() => onLog('taken')}
            accessibilityLabel={`Mark ${med.name} at ${time} as taken`}
          />
        </View>
      ) : null}
      {onUndo && logged ? (
        <DoseButton
          label="Undo"
          icon={ActionIcons.undo}
          onPress={onUndo}
          accessibilityLabel={`Undo ${STATUS_LABEL[status].toLowerCase()} for ${med.name} at ${time}`}
        />
      ) : null}
    </Surface>
  );
}

export function MedsView({ topInset, bottomInset }: { topInset: number; bottomInset: number }) {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useSession();
  const now = useMinuteClock();
  const today = toDayKey(now);
  const from = toDayKey(addDays(now, -(HISTORY_DAYS - 1)));

  const medsQuery = useMedicationsQuery();
  const dosesQuery = useDosesQuery(from, today);
  const logDose = useLogDoseMutation();
  const clearDose = useClearDoseMutation();
  const [actionError, setActionError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<{ slot: Slot; status: DoseStatus; medName: string } | null>(null);

  useRealtimeMedications();

  // Confirms the dose without needing that row to still be on screen; clears
  // itself so it never lingers over the next thing the person does.
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const meds = medsQuery.data;
  const doses = dosesQuery.data;
  const { mine, sharedByOwner, byId, doseIndex } = useMemo(() => {
    const all = meds ?? [];
    const own = all.filter((m) => m.owner_id === user?.id);
    const shared = new Map<string, { name: string; meds: Medication[] }>();
    for (const med of all) {
      if (med.owner_id === user?.id) continue;
      const entry = shared.get(med.owner_id) ?? { name: med.owner?.display_name || 'A group member', meds: [] };
      entry.meds.push(med);
      shared.set(med.owner_id, entry);
    }
    return {
      mine: own,
      sharedByOwner: [...shared.values()],
      byId: new Map(all.map((m) => [m.id, m])),
      doseIndex: indexDoses<MedicationDose>(doses ?? []),
    };
  }, [meds, doses, user?.id]);

  const todaySlots = useMemo(() => slotsForDayAll(mine, today), [mine, today]);

  function handleLog(slot: Slot, status: DoseStatus, medName: string) {
    if (!user) return;
    setActionError(null);
    tapLight();
    logDose.mutate(
      buildLogDoseInput({ medicationId: slot.medicationId, slotDate: slot.day, slotTime: slot.time, status }, user.id),
      {
        onSuccess: () => setToast({ slot, status, medName }),
        onError: (err) => setActionError(getErrorMessage(err, 'Could not save that dose.')),
      },
    );
  }

  function handleUndo(slot: Slot) {
    setActionError(null);
    setToast(null);
    tapWarning();
    clearDose.mutate(
      { medicationId: slot.medicationId, slotDate: slot.day, slotTime: slot.time },
      { onError: (err) => setActionError(getErrorMessage(err, 'Could not undo that dose.')) },
    );
  }

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([medsQuery.refetch(), dosesQuery.refetch()]);
    setRefreshing(false);
  }

  const addButton = (
    <RoundActionButton
      icon={ActionIcons.add}
      onPress={() => router.push({ pathname: '/medication/[id]', params: { id: 'new' } })}
      accessibilityLabel="Add a medicine"
    />
  );

  const header = (
    <ThemedView style={[styles.header, { paddingTop: topInset + Spacing.two }]}>
      <ThemedText type="header" style={styles.flex}>
        Medicines
      </ThemedText>
      {addButton}
    </ThemedView>
  );

  // Rows shaped like the real list, not a bare spinner — a long list of
  // medicines is the common case here, and this is what it's about to
  // become rather than an unrelated loading screen.
  if (medsQuery.isLoading) {
    return (
      <ThemedView style={styles.container}>
        {header}
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomInset + Spacing.four }]}>
          <View style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Today
            </ThemedText>
            <SlotRowSkeleton />
            <SlotRowSkeleton />
            <SlotRowSkeleton />
          </View>
        </ScrollView>
      </ThemedView>
    );
  }

  if (medsQuery.isError && !meds) {
    return (
      <ThemedView style={styles.container}>
        {header}
        <EmptyState
          title="Something went wrong"
          message={getErrorMessage(medsQuery.error, 'Could not load your medicines.')}
          actionLabel="Retry"
          onAction={medsQuery.refetch}
        />
      </ThemedView>
    );
  }

  if (mine.length === 0 && sharedByOwner.length === 0) {
    return (
      <ThemedView style={styles.container}>
        {header}
        <EmptyState
          title="No medicines yet"
          message="Add one to get a reminder at the right time and a record of every dose."
          icon={ActionIcons.medicine}
          actionLabel="Add a medicine"
          actionIcon={ActionIcons.addMedicine}
          actionVariant="primary"
          onAction={() => router.push({ pathname: '/medication/[id]', params: { id: 'new' } })}
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {header}
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset + Spacing.four }]}>
        {mine.length > 0 ? <ReminderStatusBanner medications={mine} /> : null}

        {actionError ? (
          <ThemedText type="small" themeColor="danger">
            {actionError}
          </ThemedText>
        ) : null}

        {mine.length > 0 ? (
          <View style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Today
            </ThemedText>
            {todaySlots.length === 0 ? (
              <ThemedText themeColor="textSecondary">Nothing scheduled today.</ThemedText>
            ) : (
              todaySlots.map((slot) => {
                const med = byId.get(slot.medicationId)!;
                const status = slotStatus(slot, doseIndex.get(slotKey(slot.medicationId, slot.day, slot.time)), now);
                return (
                  <SlotRow
                    key={slotKey(slot.medicationId, slot.day, slot.time)}
                    slot={slot}
                    med={med}
                    status={status}
                    onLog={(next) => handleLog(slot, next, med.name)}
                    onUndo={() => handleUndo(slot)}
                  />
                );
              })
            )}
          </View>
        ) : null}

        {mine.length > 0 ? (
          <View style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Your medicines
            </ThemedText>
            {mine.map((med) => {
              const week = adherence(med, doseIndex, today, ADHERENCE_DAYS, now);
              const figure =
                week.percent === null
                  ? 'No doses due yet'
                  : `${week.percent}% taken this week${week.streak > 1 ? ` · ${week.streak}-day streak` : ''}`;
              return (
                <Pressable
                  key={med.id}
                  onPress={() => router.push({ pathname: '/medication/[id]', params: { id: med.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={`${med.name}. ${describeSchedule(med)}. ${figure}. Edit`}>
                  {({ pressed }) => (
                    <Surface style={[styles.medRow, pressed && styles.pressed]}>
                      <View style={styles.medBody}>
                        <ThemedText type="smallBold">{med.name}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {describeSchedule(med)}
                        </ThemedText>
                        {week.percent !== null ? <AdherenceBar percent={week.percent} /> : null}
                        <ThemedText type="small" themeColor="textSecondary">
                          {figure}
                          {med.shared_family_id ? ' · Shared' : ''}
                          {med.reminders_enabled ? '' : ' · Reminders off'}
                        </ThemedText>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
                    </Surface>
                  )}
                </Pressable>
              );
            })}
          </View>
        ) : (
          <PrimaryButton
            title="Add your own medicine"
            icon={ActionIcons.addMedicine}
            variant="secondary"
            onPress={() => router.push({ pathname: '/medication/[id]', params: { id: 'new' } })}
          />
        )}

        {sharedByOwner.map((owner) => {
          const slots = slotsForDayAll(owner.meds, today);
          return (
            <View key={owner.name + owner.meds[0].id} style={styles.section}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {owner.name} · shared with you
              </ThemedText>
              {slots.length === 0 ? (
                <ThemedText themeColor="textSecondary">Nothing scheduled today.</ThemedText>
              ) : (
                slots.map((slot) => (
                  <SlotRow
                    key={slotKey(slot.medicationId, slot.day, slot.time)}
                    slot={slot}
                    med={byId.get(slot.medicationId)!}
                    status={slotStatus(slot, doseIndex.get(slotKey(slot.medicationId, slot.day, slot.time)), now)}
                  />
                ))
              )}
            </View>
          );
        })}

        <ThemedText type="small" themeColor="textSecondary">
          Goodlist helps you remember and keep a record. It isn&apos;t medical advice — follow your doctor or
          pharmacist, and don&apos;t rely on reminders alone.
        </ThemedText>
      </ScrollView>

      {toast ? (
        <Toast
          message={`${STATUS_LABEL[toast.status]} · ${toast.medName}`}
          actionLabel="Undo"
          onAction={() => handleUndo(toast.slot)}
          bottomOffset={bottomInset + Spacing.three}
        />
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  content: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  section: {
    gap: Spacing.two,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  slotText: {
    flex: 1,
    gap: Spacing.half,
  },
  slotActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  mark: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  doseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    // 44dp tall with the text line: a dose button is pressed half-awake.
    minHeight: 44,
  },
  medRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  medBody: {
    flex: 1,
    gap: Spacing.half,
  },
});
