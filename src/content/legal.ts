// Single source of truth for the Privacy Policy and Terms of Service.
//
// Both the in-app screens (src/app/(app)/privacy.tsx, terms.tsx) and the
// public website (`npm run legal:site`, published to docs/legal/) render from
// this file. Google Play requires the privacy policy it reviews to match what
// the app actually does and what the Data Safety form declares, so the two
// renderings must never drift — edit the copy here and re-run the script,
// never in one place only.
//
// Kept free of React and React Native imports, and of TypeScript syntax that
// needs a real compiler (enums, namespaces, parameter properties), so that
// `node scripts/build-legal-site.mjs` can import it directly via Node's
// built-in type stripping.

export const CONTACT_EMAIL = 'jericrealubit@gmail.com';
export const EFFECTIVE_DATE = 'September 7, 2026';

/** An inline run of text: plain, bold, or the contact email as a mailto link. */
export type Span = string | { bold: string } | { email: true };

export type Block =
  | { kind: 'para'; spans: Span[] }
  /** Secondary, smaller-print paragraph — a qualifier on the clause above it. */
  | { kind: 'lead'; spans: Span[] }
  | { kind: 'bullets'; items: Span[][] }
  | { kind: 'callout'; variant: 'info' | 'warn'; spans: Span[] };

export type Clause = {
  /** Stable anchor for deep links from the Play listing and the Data Safety form. */
  id: string;
  title: string;
  blocks: Block[];
};

export type LegalDoc = {
  id: string;
  title: string;
  /** One-line summary, used as the meta description on the web page. */
  summary: string;
  clauses: Clause[];
};

export const privacyPolicy: LegalDoc = {
  id: 'privacy',
  title: 'Privacy Policy',
  summary:
    'What Goodlist collects, why, who can see it, and how to get it deleted.',
  clauses: [
    {
      id: 'who-this-covers',
      title: 'Who this covers',
      blocks: [
        {
          kind: 'para',
          spans: [
            'This policy applies to everyone who uses Goodlist — the task and group-sharing app built by an independent developer, Jeric Realubit. Goodlist runs on Supabase (Postgres + authentication) as its backend infrastructure. We don’t run ads, and we don’t use analytics or tracking SDKs of any kind in the app today.',
          ],
        },
      ],
    },
    {
      id: 'what-we-collect',
      title: 'What we collect',
      blocks: [
        {
          kind: 'para',
          spans: [
            { bold: 'Account information.' },
            ' Your email address and password (stored securely and hashed by our authentication provider — we never see it in plain text), and an optional display name.',
          ],
        },
        {
          kind: 'para',
          spans: [
            { bold: 'Task & group content.' },
            ' Anything you enter to use the app: task titles, notes, due dates, completion status, group names, invite codes, and member roles. This is the content the app exists to store.',
          ],
        },
        {
          kind: 'para',
          spans: [
            { bold: 'Activity timestamp.' },
            ' While the app is open, it records a single “last seen” time on your profile, roughly once a minute. It is one timestamp, overwritten each time — not a history of when or how you use the app — and it exists only so the app can show how many people are using Goodlist right now. Other users see that count, never your timestamp, your name, or anything you do.',
          ],
        },
        {
          kind: 'para',
          spans: [
            { bold: 'Country & time zone.' },
            ' Your device’s Region setting (a country, like “Philippines”) and its time zone (like “Asia/Manila”). These are read from your device’s own language and region settings — ',
            { bold: 'not' },
            ' from GPS, and not from your IP address. We use them only to count how many people use Goodlist in each country. You can turn this off at any time in Settings, which also clears the two values we’ve stored.',
          ],
        },
        {
          kind: 'lead',
          spans: [
            'We don’t collect your precise location, contacts, or advertising identifiers, and we don’t track you across other apps or websites. There’s nothing being collected in the background beyond what’s listed above.',
          ],
        },
      ],
    },
    {
      id: 'how-we-use-it',
      title: 'How we use it',
      blocks: [
        {
          kind: 'bullets',
          items: [
            ['To create and authenticate your account, and keep you signed in.'],
            ['To sync your Personal tasks across your own devices.'],
            ['To share Requested tasks and group task lists with the members you’ve chosen to invite.'],
            ['To send in-app notifications — for example, when someone requests a task from you.'],
            [
              'To show community totals — how many accounts exist, how many are active right now, and how many people use Goodlist solo or in a group. These are counts only; no one is identifiable from them.',
            ],
            ['To count, in aggregate, how many people use Goodlist in each country — never to locate an individual.'],
          ],
        },
        {
          kind: 'para',
          spans: ['We don’t use your data to train models, sell it, or use it for advertising.'],
        },
      ],
    },
    {
      id: 'sharing',
      title: 'Sharing within your group',
      blocks: [
        {
          kind: 'para',
          spans: [
            'Goodlist is built around small, invite-only groups — Family or Team mode, up to two per account. If you join or create one, your display name and any tasks marked as shared or requested within that group become visible to the other members — that visibility is the point of the feature, and it’s limited to people who joined using your group’s invite code.',
          ],
        },
        {
          kind: 'para',
          spans: [
            'Outside of your own group, we don’t share your personal data with other users, and we don’t share it with third parties for marketing or advertising purposes. Our infrastructure provider, Supabase, Inc., processes and stores data on our behalf as part of running the service — it doesn’t use your data for its own purposes.',
          ],
        },
      ],
    },
    {
      id: 'retention-deletion',
      title: 'Retention & deletion',
      blocks: [
        {
          kind: 'para',
          spans: [
            'Your data is kept for as long as your account exists. You can permanently delete your account at any time from Settings — this immediately and permanently removes your profile and tasks.',
          ],
        },
        {
          kind: 'callout',
          variant: 'warn',
          spans: [
            { bold: 'If you own a group' },
            ' (you created it) and other members still belong to it, we block account deletion until you transfer ownership to someone else or remove the other members first — so a deletion can’t destroy a group out from under the people in it.',
          ],
        },
        {
          kind: 'para',
          spans: [
            'You can also clear your completed/cancelled task history from the History screen at any time, independent of deleting your account.',
          ],
        },
      ],
    },
    {
      id: 'childrens-privacy',
      title: 'Children’s privacy',
      blocks: [
        {
          kind: 'para',
          spans: [
            'Goodlist is not directed at children under 13, and we do not knowingly collect personal information from children under 13. Family-group member roles like “child” are currently descriptive labels only — Goodlist does not yet offer separate child accounts, logins, or parental-control features.',
          ],
        },
      ],
    },
    {
      id: 'security',
      title: 'Security',
      blocks: [
        {
          kind: 'para',
          spans: [
            'Your data is protected with row-level database security, meaning the database itself enforces who can read or write each piece of data — a group’s tasks are only reachable by that group’s members, and personal tasks only by you. Passwords are hashed, never stored or transmitted in plain text. No method of storage or transmission is 100% secure, but we take reasonable, industry-standard steps to protect your information.',
          ],
        },
      ],
    },
    {
      id: 'your-choices',
      title: 'Your choices',
      blocks: [
        {
          kind: 'bullets',
          items: [
            [
              { bold: 'Access & correction' },
              ' — everything you’ve entered is visible and editable directly in the app.',
            ],
            [
              { bold: 'Deletion' },
              ' — delete your account anytime from Settings, or email us to request it.',
            ],
            [{ bold: 'Questions or data requests' }, ' — contact us using the email below.'],
          ],
        },
      ],
    },
    {
      id: 'changes',
      title: 'Changes to this policy',
      blocks: [
        {
          kind: 'para',
          spans: [
            'If this policy changes in a meaningful way, we’ll update the effective date above. Continuing to use Goodlist after a change means you accept the updated policy.',
          ],
        },
      ],
    },
    {
      id: 'contact',
      title: 'Contact',
      blocks: [
        {
          kind: 'para',
          spans: ['Questions about this policy or your data? Reach out at ', { email: true }, '.'],
        },
      ],
    },
  ],
};

export const termsOfService: LegalDoc = {
  id: 'terms',
  title: 'Terms of Service',
  summary: 'The terms that govern using Goodlist.',
  clauses: [
    {
      id: 'acceptance',
      title: 'Acceptance',
      blocks: [
        {
          kind: 'para',
          spans: [
            'By creating a Goodlist account or using the app, you agree to these Terms of Service. If you don’t agree, please don’t use Goodlist.',
          ],
        },
      ],
    },
    {
      id: 'the-service',
      title: 'The service',
      blocks: [
        {
          kind: 'para',
          spans: [
            'Goodlist is a task-management app for personal to-dos and group task sharing. Features include creating or joining up to two groups (Family or Team mode, each with its own member roles), requesting tasks from group members, in-app notifications, a searchable completion history with undo, offline support with automatic sync, and appearance customization. We may add, change, or remove features over time as the app evolves.',
          ],
        },
      ],
    },
    {
      id: 'your-account',
      title: 'Your account',
      blocks: [
        {
          kind: 'bullets',
          items: [
            ['You’re responsible for keeping your login credentials confidential.'],
            ['You’re responsible for the accuracy of the information you provide (like your email and display name).'],
            ['One account per person — don’t share your login with others.'],
          ],
        },
      ],
    },
    {
      id: 'groups-sharing',
      title: 'Groups & sharing',
      blocks: [
        {
          kind: 'para',
          spans: [
            'Only invite people you trust to your group — they’ll be able to see the display names and shared/requested tasks associated with that group. Anyone with your group’s invite code can join it, so treat the code like you would a shared password. You can belong to at most two groups at a time.',
          ],
        },
        {
          kind: 'callout',
          variant: 'info',
          spans: [
            'As noted in the Privacy Policy: if you own a group with other members in it, you won’t be able to delete your account until you transfer ownership or remove those members first.',
          ],
        },
      ],
    },
    {
      id: 'acceptable-use',
      title: 'Acceptable use',
      blocks: [
        {
          kind: 'para',
          spans: [
            'Don’t use Goodlist to store or share unlawful content, don’t attempt to access another person’s account or data without authorization, and don’t abuse invite codes or the request/notification system to harass other users. We may suspend or remove accounts that violate this.',
          ],
        },
      ],
    },
    {
      id: 'your-content',
      title: 'Your content',
      blocks: [
        {
          kind: 'para',
          spans: [
            'You own the tasks, notes, and other content you create in Goodlist. By using the app, you grant us the limited permission needed to store, sync, and display that content back to you — and, where you’ve chosen to share it, to the members of your group.',
          ],
        },
      ],
    },
    {
      id: 'termination',
      title: 'Termination',
      blocks: [
        {
          kind: 'para',
          spans: [
            'You can stop using Goodlist and delete your account at any time from Settings. We may suspend or terminate accounts that violate these terms or where required by law.',
          ],
        },
      ],
    },
    {
      id: 'no-warranty',
      title: 'No warranty; limitation of liability',
      blocks: [
        {
          kind: 'para',
          spans: [
            'Goodlist is provided “as is,” without warranties of any kind, express or implied, including uninterrupted availability. To the fullest extent permitted by law, we aren’t liable for indirect, incidental, or consequential damages arising from your use of the app.',
          ],
        },
      ],
    },
    {
      id: 'changes',
      title: 'Changes to these terms',
      blocks: [
        {
          kind: 'para',
          spans: [
            'We may update these terms as Goodlist evolves. Material changes will update the effective date above. Continued use after a change means you accept the updated terms.',
          ],
        },
      ],
    },
    {
      id: 'contact',
      title: 'Contact',
      blocks: [
        {
          kind: 'para',
          spans: ['Questions about these terms? Reach out at ', { email: true }, '.'],
        },
      ],
    },
  ],
};

/**
 * Web-only. Google Play's User Data policy requires apps that let users create
 * an account to offer deletion from a public web page as well as from inside
 * the app, and the Data Safety form has a required field for that URL. This
 * document is what lives at that URL; it has no in-app screen because the app
 * already has the real thing (Settings → Delete account).
 */
export const accountDeletion: LegalDoc = {
  id: 'delete-account',
  title: 'Delete your Goodlist account',
  summary:
    'How to permanently delete your Goodlist account and all of your data, in the app or by request.',
  clauses: [
    {
      id: 'in-the-app',
      title: 'In the app (immediate)',
      blocks: [
        {
          kind: 'para',
          spans: [
            'Deleting from inside Goodlist is immediate and permanent — there is no queue and no waiting period:',
          ],
        },
        {
          kind: 'bullets',
          items: [
            ['Open Goodlist and sign in.'],
            [{ bold: 'Settings' }, ' tab → scroll to the bottom.'],
            [{ bold: 'Delete account' }, ' → confirm.'],
          ],
        },
        {
          kind: 'callout',
          variant: 'warn',
          spans: [
            { bold: 'If you own a group' },
            ' that still has other members in it, deletion is blocked until you transfer ownership or remove those members — otherwise deleting your account would destroy a group other people are still using. Transfer or remove first, then delete.',
          ],
        },
      ],
    },
    {
      id: 'by-request',
      title: 'By request (if you can’t use the app)',
      blocks: [
        {
          kind: 'para',
          spans: [
            'Lost your device, or can’t sign in? Email ',
            { email: true },
            ' from the address on the account, with the subject “Delete my Goodlist account”. We verify that the request came from the account’s own email address and then delete it for you, normally within 30 days and usually much sooner.',
          ],
        },
      ],
    },
    {
      id: 'what-is-deleted',
      title: 'What gets deleted',
      blocks: [
        {
          kind: 'para',
          spans: [
            'Everything tied to your account is removed permanently and is not recoverable:',
          ],
        },
        {
          kind: 'bullets',
          items: [
            ['Your account and sign-in credentials.'],
            ['Your display name and profile.'],
            ['All of your personal tasks, notes, and due dates.'],
            ['Your completion and cancellation history.'],
            ['Your notifications.'],
            ['Your group memberships, and any country/time-zone value stored for community stats.'],
          ],
        },
        {
          kind: 'lead',
          spans: [
            'Tasks you requested from someone else remain on their list as tasks they were asked to do, with your name no longer attached. Groups you were a member of but did not own continue to exist for their remaining members.',
          ],
        },
        {
          kind: 'para',
          spans: [
            'We keep no backup copy of a deleted account beyond our infrastructure provider’s routine encrypted database backups, which age out on their own schedule and are never used to restore an individual deleted account.',
          ],
        },
      ],
    },
    {
      id: 'partial',
      title: 'Deleting only some data',
      blocks: [
        {
          kind: 'bullets',
          items: [
            [
              { bold: 'History' },
              ' — clear completed and cancelled tasks individually, or all at once, from the History tab.',
            ],
            [
              { bold: 'Country & time zone' },
              ' — turn off the community-stats toggle in Settings → Privacy. That clears the two stored values without touching anything else.',
            ],
            [{ bold: 'Individual tasks' }, ' — delete any task from the task list or its detail screen.'],
          ],
        },
      ],
    },
  ],
};
