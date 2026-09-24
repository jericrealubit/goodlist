import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, BackHandler, ScrollView, StyleSheet, Vibration, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { useSurfaceStyle } from '@/components/surface';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ActionIcons } from '@/constants/icons';
import { EasingBreathe, PulseCycle } from '@/constants/motion';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSession } from '@/contexts/session-context';
import { useAlarmState } from '@/hooks/use-alarms';
import { buildLogDoseInput, useLogDoseMutation } from '@/hooks/use-medication-mutations';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useCompleteTaskMutation } from '@/hooks/use-task-mutations';
import { useOpenTasksQuery } from '@/hooks/use-tasks-query';
import { useTheme } from '@/hooks/use-theme';
import { snoozeAlarm, stopAlarms } from '@/lib/alarms/answer';
import { ALARM_VIBRATION } from '@/lib/alarms/alarm-style';
import { SNOOZE_MINUTES, type Alarm } from '@/lib/alarms/ringing';

const alarmSound = require('@/assets/sounds/alarm.wav');

function formatClock(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * The alarm itself, while the app is open: loops the alarm sound and
 * vibration until every ringing alarm is answered — stopped, snoozed, or
 * done/taken. `useAlarms` puts it up whenever something is ringing; it takes
 * itself down when nothing is.
 *
 * Deliberately hard to leave without answering: full screen, no header, no
 * swipe-down (see the (app) layout), and Android's back button does nothing.
 */
export default function AlarmScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { top, bottom } = useSafeAreaInsets();
  const { ringing, ready } = useAlarmState();
  const isRinging = ringing.length > 0;

  useAlarmSound(isRinging);

  // Nothing left ringing: go back to wherever the alarm interrupted.
  const closed = useRef(false);
  useEffect(() => {
    if (!ready || isRinging || closed.current) return;
    closed.current = true;
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [ready, isRinging, router]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, []);

  const firstTitle = ringing[0]?.title;
  useEffect(() => {
    if (firstTitle) AccessibilityInfo.announceForAccessibility(`Alarm: ${firstTitle}`);
  }, [firstTitle]);

  return (
    <ThemedView style={[styles.screen, { paddingTop: top + Spacing.four, paddingBottom: bottom + Spacing.three }]}>
      <View style={styles.header}>
        <AlarmGlyph color={theme.danger} />
        <ThemedText type="subtitle" accessibilityRole="header" style={styles.centered}>
          {ringing.length > 1 ? `${ringing.length} alarms` : 'Alarm'}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.centered}>
          It keeps ringing until you answer it.
        </ThemedText>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {ringing.map((alarm) => (
          <AlarmCard key={alarm.key} alarm={alarm} />
        ))}
      </ScrollView>

      {ringing.length > 1 ? (
        <View style={styles.footer}>
          <PrimaryButton
            title="Stop all"
            icon={ActionIcons.stopAlarm}
            variant="danger"
            onPress={() => stopAlarms(ringing.map((a) => a.key))}
          />
        </View>
      ) : null}
    </ThemedView>
  );
}

/** Loops the alarm sound and vibration for as long as `active`. */
function useAlarmSound(active: boolean) {
  const player = useAudioPlayer(alarmSound);

  useEffect(() => {
    if (!active) return;
    let stopped = false;
    // Ring even with the ringer switch on silent, and pause other audio
    // rather than mixing under it: this is an alarm, not a sound effect.
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'doNotMix' })
      .catch(() => {})
      .finally(() => {
        // Answered before the audio session was ready: don't start after all.
        if (stopped) return;
        player.loop = true;
        player.volume = 1;
        player.play();
      });
    Vibration.vibrate(ALARM_VIBRATION, true);
    return () => {
      stopped = true;
      player.pause();
      Vibration.cancel();
    };
  }, [active, player]);
}

function AlarmGlyph({ color }: { color: string }) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) return;
    scale.value = withRepeat(withTiming(1.12, { duration: PulseCycle / 3, easing: EasingBreathe }), -1, true);
  }, [reducedMotion, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[styles.glyph, { borderColor: color }, style]} accessibilityElementsHidden importantForAccessibility="no">
      <Ionicons name={ActionIcons.alarm} size={48} color={color} />
    </Animated.View>
  );
}

function AlarmCard({ alarm }: { alarm: Alarm }) {
  const theme = useTheme();
  const surface = useSurfaceStyle('lg');
  const { user } = useSession();
  const { data: tasks } = useOpenTasksQuery();
  const completeTask = useCompleteTaskMutation();
  const logDose = useLogDoseMutation();
  const { source } = alarm;

  function finish() {
    stopAlarms([alarm.key]);
    if (source.kind === 'task') {
      const task = tasks?.find((t) => t.id === source.taskId);
      if (task) completeTask.mutate(task);
    } else if (user) {
      logDose.mutate(
        buildLogDoseInput(
          { medicationId: source.medicationId, slotDate: source.day, slotTime: source.time, status: 'taken' },
          user.id,
        ),
      );
    }
  }

  return (
    <View style={[surface, styles.card]}>
      <View style={styles.cardHeading}>
        <Ionicons
          name={source.kind === 'task' ? ActionIcons.complete : ActionIcons.medicine}
          size={22}
          color={theme.text}
        />
        <View style={styles.cardText}>
          <ThemedText type="header" numberOfLines={3}>
            {alarm.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {`${source.kind === 'task' ? 'Due' : 'Scheduled'} ${formatClock(alarm.at)}`}
          </ThemedText>
        </View>
      </View>
      {alarm.body ? <ThemedText numberOfLines={4}>{alarm.body}</ThemedText> : null}

      <PrimaryButton title="Stop alarm" icon={ActionIcons.stopAlarm} variant="danger" onPress={() => stopAlarms([alarm.key])} />
      <View style={styles.row}>
        <PrimaryButton
          title={source.kind === 'task' ? 'Mark done' : 'Taken'}
          icon={source.kind === 'task' ? ActionIcons.complete : ActionIcons.doseTaken}
          variant="secondary"
          style={styles.rowButton}
          onPress={finish}
        />
        <PrimaryButton
          title={`Snooze ${SNOOZE_MINUTES} min`}
          icon={ActionIcons.snooze}
          variant="secondary"
          style={styles.rowButton}
          onPress={() => snoozeAlarm(alarm.key)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  centered: {
    textAlign: 'center',
  },
  glyph: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  list: {
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  listContent: {
    gap: Spacing.three,
    paddingBottom: Spacing.three,
  },
  card: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  cardHeading: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  cardText: {
    flex: 1,
    gap: Spacing.half,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  rowButton: {
    flex: 1,
  },
  footer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingTop: Spacing.two,
  },
});
