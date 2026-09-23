/**
 * Which local notifications *should* exist for alarmed tasks, and how to get
 * from the ones that do exist to those.
 *
 * Unlike medicine reminders (repeating DAILY/WEEKLY triggers), a task alarm is
 * one specific instant — its due_at — so this plans one-shot requests, not a
 * recurring schedule. That also means an alarm naturally disappears once it
 * fires or the task is done; there's no need to "retire" it the way a
 * medicine course's end date has to be watched for.
 *
 * Identifiers are deterministic (one per task) and each request carries a
 * signature of its content, so reconciling is a pure diff: nothing is
 * cancelled and re-created unless it actually changed.
 */

export type RemindableTask = {
  id: string;
  title: string;
  notes: string | null;
  due_at: string | null;
  alarm_enabled: boolean;
  status: 'open' | 'completed' | 'cancelled';
  assignee_id: string;
};

export type TaskReminderRequest = {
  identifier: string;
  taskId: string;
  date: Date;
  title: string;
  body: string;
  /** Changes whenever anything that is shown or scheduled changes. */
  signature: string;
};

export type ScheduledTaskReminder = { identifier: string; signature: string | null };

/** Every reminder this module owns starts with this; medicine reminders and snoozes are left alone. */
export const TASK_REMINDER_PREFIX = 'task:';

/**
 * Medicines already reserve up to 60 of iOS's 64-pending-notification cap for
 * themselves. Task alarms get their own separate, smaller budget rather than
 * a shared counter between two independently-syncing hooks — a one-shot
 * alarm is cancelled the moment its task completes, cancels, or is deleted,
 * so the steady-state count here is naturally small ("todos due in the
 * future with alarms on"), never an ever-growing backlog the way a
 * permanently-recurring medicine reminder could approach. A household
 * simultaneously near both caps could in principle still exceed 64 — iOS
 * would silently drop the excess, no worse than today's medicine-only case.
 */
export const TASK_REMINDER_LIMIT = 20;

export function taskReminderIdentifier(taskId: string): string {
  return `${TASK_REMINDER_PREFIX}${taskId}`;
}

/**
 * Alarms are scheduled on the assignee's device — a requester shouldn't be
 * buzzed for a task they merely handed off to someone else. A task whose due
 * instant has already passed is dropped rather than fired late the next time
 * the app comes to the foreground.
 */
export function isAlarmable(task: RemindableTask, currentUserId: string, now: Date): boolean {
  if (!task.alarm_enabled || task.status !== 'open') return false;
  if (task.assignee_id !== currentUserId) return false;
  if (!task.due_at) return false;
  return new Date(task.due_at) > now;
}

export function planTaskReminders(
  tasks: RemindableTask[],
  currentUserId: string,
  now: Date,
): { requests: TaskReminderRequest[]; overflow: number } {
  const requests: TaskReminderRequest[] = [];

  for (const task of tasks) {
    if (!isAlarmable(task, currentUserId, now)) continue;
    const date = new Date(task.due_at!);
    const title = task.title;
    const body = task.notes || 'Due now.';
    requests.push({
      identifier: taskReminderIdentifier(task.id),
      taskId: task.id,
      date,
      title,
      body,
      signature: [title, body, date.toISOString()].join('|'),
    });
  }

  // Over the cap, keep whichever are due soonest — the ones furthest out have
  // the most time left for a resync (app foregrounded again) to pick them up
  // once something closer has fired and freed a slot.
  requests.sort((a, b) => a.date.getTime() - b.date.getTime());
  return {
    requests: requests.slice(0, TASK_REMINDER_LIMIT),
    overflow: Math.max(0, requests.length - TASK_REMINDER_LIMIT),
  };
}

export function diffTaskReminders(
  desired: TaskReminderRequest[],
  existing: ScheduledTaskReminder[],
): { toSchedule: TaskReminderRequest[]; toCancel: string[] } {
  const ours = existing.filter((e) => e.identifier.startsWith(TASK_REMINDER_PREFIX));
  const existingById = new Map(ours.map((e) => [e.identifier, e.signature]));
  const desiredById = new Map(desired.map((d) => [d.identifier, d]));

  const toCancel = ours
    .filter((e) => desiredById.get(e.identifier)?.signature !== e.signature)
    .map((e) => e.identifier);
  const toSchedule = desired.filter((d) => existingById.get(d.identifier) !== d.signature);
  return { toSchedule, toCancel };
}
