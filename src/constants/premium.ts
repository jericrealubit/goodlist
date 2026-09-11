export const TRIAL_DAYS = 90;

export const PREMIUM_PRICES = {
  monthly: '$1.99',
  yearly: '$14.99',
};

export const READ_ONLY_MESSAGE = 'This group is read-only until its owner renews Premium.';

// create_household raises with this prefix when a second group needs Premium.
export function isPremiumRequiredError(err: unknown): boolean {
  return (
    !!err &&
    typeof err === 'object' &&
    'message' in err &&
    typeof err.message === 'string' &&
    err.message.startsWith('PREMIUM_REQUIRED')
  );
}
