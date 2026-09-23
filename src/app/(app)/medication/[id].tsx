import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { DueDatePicker } from '@/components/due-date-picker';
import { HeaderAction, HeaderActionSlot } from '@/components/header-action';
import { LoadingState } from '@/components/loading-state';
import { TimePicker } from '@/components/meds/time-picker';
import { OptionPicker } from '@/components/option-picker';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ALL_DAYS, WeekdayChips } from '@/components/weekday-chips';
import { ActionIcons } from '@/constants/icons';
import { isPremiumRequiredError } from '@/constants/premium';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/contexts/session-context';
import { useGroupsQuery } from '@/hooks/use-group-query';
import {
  buildNewMedicationInput,
  useCreateMedicationMutation,
  useDeleteMedicationMutation,
  useUpdateMedicationMutation,
} from '@/hooks/use-medication-mutations';
import { useMedicationDetailQuery } from '@/hooks/use-medications-query';
import { usePremiumStatus } from '@/hooks/use-premium-query';
import { useTheme } from '@/hooks/use-theme';
import { fromDayKey, toDayKey } from '@/lib/calendar/day';
import { getErrorMessage } from '@/lib/errors';
import { normalizeTimes, parseTime, formatTime } from '@/lib/medications/schedule';
import { startPremiumTrial } from '@/lib/mutations/premium';
import { groupKeys, premiumKeys } from '@/lib/query-client';
import { remindersSupported, requestReminderPermission } from '@/lib/reminders';
import type { MedicationInput } from '@/lib/types';

const NEW_ID = 'new';
const MAX_TIMES = 12;

/** A sensible next time to offer: four hours after the last one, else 08:00. */
function nextTime(times: string[]): string {
  const last = parseTime(normalizeTimes(times).at(-1) ?? '');
  if (!last) return '08:00';
  return formatTime(Math.min(last.hour + 4, 23), last.minute);
}

export default function EditMedicationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === NEW_ID;
  const router = useRouter();
  const theme = useTheme();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const { data: existing, isLoading } = useMedicationDetailQuery(isNew ? '' : id);
  const { data: groups } = useGroupsQuery();
  const { status: premium } = usePremiumStatus();
  const createMutation = useCreateMedicationMutation();
  const updateMutation = useUpdateMedicationMutation();
  const deleteMutation = useDeleteMedicationMutation();
  const [startingTrial, setStartingTrial] = useState(false);

  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [instructions, setInstructions] = useState('');
  const [times, setTimes] = useState<string[]>(['08:00']);
  const [everyDay, setEveryDay] = useState(true);
  const [days, setDays] = useState<number[]>(ALL_DAYS);
  const [startDate, setStartDate] = useState<Date>(() => new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [sharedFamilyId, setSharedFamilyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!existing || initializedRef.current) return;
    initializedRef.current = true;
    setName(existing.name);
    setDose(existing.dose ?? '');
    setInstructions(existing.instructions ?? '');
    setTimes(existing.times);
    setEveryDay(!existing.days_of_week);
    setDays(existing.days_of_week ?? ALL_DAYS);
    setStartDate(fromDayKey(existing.start_date) ?? new Date());
    setEndDate(existing.end_date ? fromDayKey(existing.end_date) : null);
    setRemindersEnabled(existing.reminders_enabled);
    setSharedFamilyId(existing.shared_family_id);
  }, [existing]);

  const isOwner = isNew || existing?.owner_id === user?.id;
  // Sharing an already-shared medicine stays editable after Premium lapses;
  // only *starting* to share is gated, exactly as the server trigger is.
  const startsSharing = !!sharedFamilyId && sharedFamilyId !== existing?.shared_family_id;
  const shareBlocked = startsSharing && !premium.isPremium;

  function buildInput(): MedicationInput | null {
    const cleanTimes = normalizeTimes(times);
    if (!name.trim()) {
      setError('Give the medicine a name.');
      return null;
    }
    if (cleanTimes.length === 0) {
      setError('Add at least one time.');
      return null;
    }
    if (!everyDay && days.length === 0) {
      setError('Pick at least one day.');
      return null;
    }
    const start = toDayKey(startDate);
    const end = endDate ? toDayKey(endDate) : null;
    if (end && end < start) {
      setError('The last day can’t be before the first.');
      return null;
    }
    if (shareBlocked) {
      setError('Sharing medicines with a group needs Premium.');
      return null;
    }
    return {
      name,
      dose: dose || null,
      instructions: instructions || null,
      times: cleanTimes,
      days_of_week: everyDay || days.length === 7 ? null : days,
      start_date: start,
      end_date: end,
      reminders_enabled: remindersEnabled,
      shared_family_id: sharedFamilyId,
    };
  }

  function handleError(err: unknown) {
    setError(
      isPremiumRequiredError(err)
        ? 'Sharing medicines with a group needs Premium.'
        : getErrorMessage(err, 'Could not save this medicine.'),
    );
  }

  // The database grants this same trial the moment a share actually goes
  // through (start_premium_trial_if_unused), so this only makes the link feel
  // immediate: tap it, the block clears, and Save works on the first try.
  async function handleStartTrial() {
    if (startingTrial) return;
    setError(null);
    setStartingTrial(true);
    try {
      await startPremiumTrial();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: premiumKeys.mine }),
        queryClient.invalidateQueries({ queryKey: groupKeys.mine }),
      ]);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not start your trial.'));
    } finally {
      setStartingTrial(false);
    }
  }

  // Optimistic like the task editor: the cache updates instantly and the
  // screen closes; a later server refusal rolls the cache back.
  async function handleSave() {
    if (!user) return;
    const input = buildInput();
    if (!input) return;
    setError(null);

    if (isNew) {
      createMutation.mutate(buildNewMedicationInput(input, user.id), { onError: handleError });
    } else {
      updateMutation.mutate({ id, ...input }, { onError: handleError });
    }
    // Asked here — the moment reminders mean something — and never at launch.
    // The layout's sync picks the new schedule up once permission lands.
    if (input.reminders_enabled && remindersSupported) {
      await requestReminderPermission().catch(() => {});
    }
    router.back();
  }

  function handleArchive() {
    updateMutation.mutate({ id, archived_at: new Date().toISOString() }, { onError: handleError });
    router.back();
  }

  function handleDelete() {
    deleteMutation.mutate({ id }, { onError: handleError });
    router.back();
  }

  if (!isNew && (isLoading || !existing)) {
    return isLoading ? <LoadingState /> : <ThemedText style={styles.missing}>This medicine is no longer here.</ThemedText>;
  }

  if (!isOwner) {
    return (
      <ThemedView style={styles.content}>
        <ThemedText>
          {existing?.owner?.display_name || 'A group member'} shares this medicine with you. Only they can change it.
        </ThemedText>
      </ThemedView>
    );
  }

  const shareOptions = [
    { id: 'none', label: 'Only me' },
    ...(groups ?? []).map((g) => ({ id: g.id, label: g.name })),
  ];

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: isNew ? 'Add medicine' : 'Edit medicine',
          headerRight: () => (
            <HeaderActionSlot>
              <HeaderAction label="Save" icon={ActionIcons.save} onPress={handleSave} />
            </HeaderActionSlot>
          ),
        }}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TextField label="Name" value={name} onChangeText={setName} placeholder="Metformin" maxLength={120} />
          <TextField
            label="Dose (optional)"
            value={dose}
            onChangeText={setDose}
            placeholder="500 mg · 1 tablet"
            maxLength={120}
          />
          <TextField
            label="Instructions (optional)"
            value={instructions}
            onChangeText={setInstructions}
            placeholder="With food"
            multiline
            autoGrow
            maxLength={1000}
            style={styles.noteInput}
          />

          <View style={styles.group}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Times
            </ThemedText>
            {times.map((time, index) => (
              <View key={index} style={styles.timeRow}>
                <TimePicker
                  value={time}
                  onChange={(next) => setTimes(times.map((t, i) => (i === index ? next : t)))}
                  accessibilityLabel={`Time ${index + 1}`}
                />
                {times.length > 1 ? (
                  <Pressable
                    onPress={() => setTimes(times.filter((_, i) => i !== index))}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove time ${index + 1}`}>
                    <Ionicons name={ActionIcons.clear} size={22} color={theme.danger} />
                  </Pressable>
                ) : null}
              </View>
            ))}
            {times.length < MAX_TIMES ? (
              <PrimaryButton
                title="Add a time"
                icon={ActionIcons.addMedicine}
                variant="secondary"
                onPress={() => setTimes([...times, nextTime(times)])}
              />
            ) : null}
          </View>

          <View style={styles.group}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Days
            </ThemedText>
            <OptionPicker
              layout="row"
              options={[
                { id: 'every', label: 'Every day' },
                { id: 'some', label: 'Some days' },
              ]}
              selectedId={everyDay ? 'every' : 'some'}
              onSelect={(choice) => setEveryDay(choice === 'every')}
            />
            {!everyDay ? <WeekdayChips value={days} onChange={setDays} /> : null}
          </View>

          <View style={styles.group}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Starts
            </ThemedText>
            <DueDatePicker
              value={startDate}
              onChange={(next) => setStartDate(next ?? new Date())}
              name="start date"
              placeholder="Today"
            />
          </View>

          <View style={styles.group}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Last day (optional)
            </ThemedText>
            <DueDatePicker value={endDate} onChange={setEndDate} name="last day" placeholder="Ongoing" />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.flex}>
              <ThemedText>Remind me</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {remindersSupported
                  ? 'A notification at each time, with Taken and Snooze buttons.'
                  : 'Reminders arrive on the Goodlist phone app.'}
              </ThemedText>
            </View>
            <Switch
              value={remindersEnabled}
              onValueChange={setRemindersEnabled}
              trackColor={{ true: theme.primary, false: theme.border }}
              accessibilityLabel="Remind me"
            />
          </View>

          {groups?.length ? (
            <View style={styles.group}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Who can see it
              </ThemedText>
              <OptionPicker
                options={shareOptions}
                selectedId={sharedFamilyId ?? 'none'}
                onSelect={(choice) => setSharedFamilyId(choice === 'none' ? null : choice)}
              />
              <ThemedText type="small" themeColor="textSecondary">
                A group sees this medicine&apos;s schedule and which doses you&apos;ve taken, skipped or missed. It
                can&apos;t change anything.
              </ThemedText>
              {shareBlocked ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Sharing with a group is part of Premium.{' '}
                  <ThemedText
                    type="linkPrimary"
                    onPress={premium.trialUsed ? () => router.push('/premium') : handleStartTrial}
                    accessibilityState={{ disabled: startingTrial }}>
                    {premium.trialUsed ? 'See Premium' : startingTrial ? 'Starting…' : 'Start your free trial'}
                  </ThemedText>
                </ThemedText>
              ) : null}
            </View>
          ) : null}

          {error ? (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          ) : null}

          {!isNew ? (
            <>
              <PrimaryButton
                title="Stop taking (keep history)"
                icon={ActionIcons.archive}
                variant="secondary"
                onPress={handleArchive}
              />
              {confirmingDelete ? (
                <>
                  <ThemedText type="small" themeColor="danger">
                    This deletes the medicine and every dose you&apos;ve logged for it. It can&apos;t be undone.
                  </ThemedText>
                  <PrimaryButton title="Yes, delete it" icon={ActionIcons.delete} variant="danger" onPress={handleDelete} />
                  <PrimaryButton
                    title="Cancel"
                    icon={ActionIcons.cancel}
                    variant="secondary"
                    onPress={() => setConfirmingDelete(false)}
                  />
                </>
              ) : (
                <PrimaryButton
                  title="Delete medicine"
                  icon={ActionIcons.delete}
                  variant="danger"
                  onPress={() => setConfirmingDelete(true)}
                />
              )}
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
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
  missing: {
    padding: Spacing.four,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  group: {
    gap: Spacing.two,
  },
  noteInput: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
