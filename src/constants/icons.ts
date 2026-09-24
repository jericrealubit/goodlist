import { Ionicons } from '@expo/vector-icons';

export type IconName = keyof typeof Ionicons.glyphMap;

/**
 * One glyph per *action*, not per screen: "save" draws the same icon in the
 * task editor, in Settings and in the group card, so a glyph means the same
 * thing everywhere it appears. Screens import from here rather than naming
 * Ionicons directly, which is what keeps that promise true over time.
 */
export const ActionIcons = {
  save: 'save-outline',
  edit: 'create-outline',
  delete: 'trash-outline',
  cancel: 'close-outline',
  confirm: 'checkmark-outline',
  send: 'arrow-up',
  complete: 'checkmark-circle-outline',
  reopen: 'arrow-undo-outline',
  undo: 'arrow-undo-outline',
  retry: 'refresh-outline',
  back: 'arrow-back-outline',
  continue: 'arrow-forward-outline',
  share: 'share-social-outline',
  group: 'people-outline',
  createGroup: 'add-circle-outline',
  joinGroup: 'enter-outline',
  leaveGroup: 'exit-outline',
  makeOwner: 'star-outline',
  removeMember: 'person-remove-outline',
  signIn: 'log-in-outline',
  signOut: 'log-out-outline',
  createAccount: 'person-add-outline',
  email: 'mail-outline',
  password: 'key-outline',
  dueDate: 'calendar-outline',
  repeat: 'repeat-outline',
  stopRepeat: 'stop-circle-outline',
  calendarView: 'calendar-number-outline',
  guide: 'book-outline',
  clear: 'close-circle-outline',
  voice: 'mic-outline',
  voiceListening: 'stop-circle-outline',
  openLink: 'open-outline',
  premium: 'diamond-outline',
  add: 'add',
  addMedicine: 'add-circle-outline',
  medicine: 'medical-outline',
  skipDose: 'play-skip-forward-outline',
  archive: 'archive-outline',
  reminders: 'notifications-outline',
  time: 'time-outline',
  // A dose's state, and a day's medicine verdict on the calendar. Shape carries
  // the meaning so it survives every theme and colour-blindness.
  doseTaken: 'checkmark',
  doseMissed: 'close',
  doseSkipped: 'remove',
  doseDue: 'ellipse-outline',
  remindersOff: 'notifications-off-outline',
  systemStatus: 'information-circle-outline',
  // A ringing alarm, and the ways to answer it.
  alarm: 'alarm-outline',
  stopAlarm: 'stop-circle-outline',
  snooze: 'hourglass-outline',
} as const satisfies Record<string, IconName>;
