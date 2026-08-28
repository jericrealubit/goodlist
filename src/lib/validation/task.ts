export function validateTaskTitle(title: string): string | null {
  if (title.trim().length === 0) {
    return 'Give your task a title.';
  }
  return null;
}
