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
  guide: 'book-outline',
  clear: 'close-circle-outline',
  premium: 'diamond-outline',
} as const satisfies Record<string, IconName>;
