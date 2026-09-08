// Single source of truth for the in-app user guide (src/app/(app)/guide.tsx).
//
// Same shape as src/content/legal.ts, and kept to the same rules: no React or
// React Native imports, and no TypeScript syntax that needs a real compiler,
// so a future `guide:site` build can import this module directly the way
// scripts/build-legal-site.mjs imports the legal copy.
//
// That is also why screenshots are referenced by NAME rather than by
// `require()`: the bundler resolves those names to assets in
// src/components/guide-document.tsx, and this module stays plain data.
//
// The screenshots themselves come from `npm run guide:screens`, which writes
// both assets/images/guide/ (bundled here) and docs/user-guide/images/ (the
// GitHub-readable version of this same walkthrough).

/** An inline run of text: plain or bold. Assignable to the legal `Span`. */
export type GuideSpan = string | { bold: string };

/** Named screenshot in assets/images/guide/ — see SHOTS in guide-document.tsx. */
export type ShotName =
  | '01-create-account'
  | '02-log-in'
  | '03-solo-empty'
  | '04-first-task'
  | '05-my-list'
  | '06-swipe-done'
  | '07-task-details'
  | '08-history'
  | '09-group-solo'
  | '10-create-group'
  | '11-invite-code'
  | '12-join-code'
  | '13-join-role'
  | '14-requested-tab'
  | '15-request-sent'
  | '16-their-inbox'
  | '17-settings';

export type GuideBlock =
  | { kind: 'para'; spans: GuideSpan[] }
  | { kind: 'lead'; spans: GuideSpan[] }
  | { kind: 'bullets'; items: GuideSpan[][] }
  | { kind: 'callout'; variant: 'info' | 'warn'; spans: GuideSpan[] }
  | { kind: 'image'; shot: ShotName; caption: string };

export type GuideStep = {
  id: string;
  title: string;
  /** Renders a part heading above this step — starts a new half of the guide. */
  part?: string;
  blocks: GuideBlock[];
};

/** An unnumbered section, shown after the numbered steps. */
export type GuideSection = {
  id: string;
  title: string;
  blocks: GuideBlock[];
};

export type GuideDoc = {
  title: string;
  subtitle: string;
  /** Unnumbered, shown before step 1. */
  intro: GuideBlock[];
  /** Numbered continuously from 1, across both parts. */
  steps: GuideStep[];
  extras: GuideSection[];
};

export const userGuide: GuideDoc = {
  title: 'How to use Goodlist',
  subtitle: 'Every step has a picture. No experience needed.',
  intro: [
    {
      kind: 'callout',
      variant: 'info',
      spans: [
        'In every picture, the ',
        { bold: 'red dotted box' },
        ' shows you exactly where to tap, and the red number tells you the order. That is the whole trick — find the red box, tap it.',
      ],
    },
    {
      kind: 'para',
      spans: [
        { bold: 'The four buttons at the bottom.' },
        ' They never change. Tap one and the page changes — that is all they do, and you cannot break anything by tapping them.',
      ],
    },
    {
      kind: 'bullets',
      items: [
        [{ bold: 'Tasks' }, ' — your list of things to do. This is the main page.'],
        [{ bold: 'Group' }, ' — the people you share with. Empty at first, and that is fine.'],
        [{ bold: 'History' }, ' — everything you have already finished.'],
        [{ bold: 'Settings' }, ' — your name, the colours, and signing out.'],
      ],
    },
  ],
  steps: [
    {
      id: 'create-account',
      title: 'Make your account',
      part: 'Part 1 — Just you',
      blocks: [
        {
          kind: 'lead',
          spans: [
            'You do not need anybody else to use Goodlist. It works perfectly well on your own.',
          ],
        },
        { kind: 'para', spans: ['Open Goodlist. The first thing it asks is who you are.'] },
        {
          kind: 'bullets',
          items: [
            ['Type your ', { bold: 'name' }, ' in the first box. You can skip this one.'],
            ['Type your ', { bold: 'email' }, ' in the second box.'],
            [
              'Make up a ',
              { bold: 'password' },
              ' and type it twice, so the app knows you did not mistype it. It has to be 6 letters or numbers or more.',
            ],
            ['Tap ', { bold: 'Create account' }, '.'],
          ],
        },
        {
          kind: 'image',
          shot: '01-create-account',
          caption: 'Tap the green button once the boxes are filled in.',
        },
        {
          kind: 'callout',
          variant: 'info',
          spans: [
            'If it says ',
            { bold: 'Check your email' },
            ' — go to your email, open the message from Goodlist, and tap the link inside. Then come back to the app.',
          ],
        },
      ],
    },
    {
      id: 'log-in',
      title: 'Log in',
      blocks: [
        {
          kind: 'para',
          spans: [
            'Already made an account? Type your email and password, then tap ',
            { bold: 'Log in' },
            '. You only have to do this once — the app remembers you afterwards.',
          ],
        },
        { kind: 'image', shot: '02-log-in', caption: 'The screen you see when you come back.' },
        {
          kind: 'callout',
          variant: 'info',
          spans: [
            { bold: 'Forgot your password?' },
            ' Tap Forgot password? just under the button. Goodlist emails you a link to make a new one.',
          ],
        },
      ],
    },
    {
      id: 'first-task',
      title: 'Add your first thing to do',
      blocks: [
        {
          kind: 'para',
          spans: [
            'The page says ',
            { bold: 'Solo mode' },
            ' at the top. Solo just means on your own. The list is empty because you have not put anything in it yet.',
          ],
        },
        { kind: 'image', shot: '03-solo-empty', caption: 'An empty list. Nothing is wrong.' },
        {
          kind: 'para',
          spans: ['At the bottom there is a long white box that says I want to...'],
        },
        {
          kind: 'bullets',
          items: [
            ['Tap that box. The keyboard comes up.'],
            ['Type the thing you want to do. Anything at all.'],
            ['Tap the ', { bold: 'round green arrow' }, ' next to the box.'],
          ],
        },
        { kind: 'image', shot: '04-first-task', caption: 'Type, then tap the arrow.' },
        {
          kind: 'para',
          spans: [
            'That is it. The box empties itself so you can type the next one straight away. Add as many as you like.',
          ],
        },
      ],
    },
    {
      id: 'your-list',
      title: 'Look at your list',
      blocks: [
        { kind: 'para', spans: ['Every task sits on its own little white card.'] },
        {
          kind: 'bullets',
          items: [
            ['The ', { bold: 'empty circle' }, ' on the left means not done yet.'],
            ['Small grey writing underneath tells you extra things, like a due date.'],
            ['A task with a line through it is one you already finished.'],
          ],
        },
        { kind: 'image', shot: '05-my-list', caption: 'Four tasks. The bottom one is done.' },
        {
          kind: 'callout',
          variant: 'info',
          spans: [
            { bold: 'To move a task up or down:' },
            ' press your finger on it, hold, and slide it where you want. Let go. Put the important ones at the top.',
          ],
        },
      ],
    },
    {
      id: 'tick-off',
      title: 'Tick something off',
      blocks: [
        {
          kind: 'para',
          spans: ['There are two ways to finish a task, and both do exactly the same thing:'],
        },
        {
          kind: 'bullets',
          items: [
            [{ bold: 'Tap the circle' }, ' on the left of the task, or'],
            [
              { bold: 'slide the task to the right' },
              ' with your finger. A green ✓ Done appears behind it.',
            ],
          ],
        },
        { kind: 'image', shot: '06-swipe-done', caption: 'Sliding right reveals ✓ Done.' },
        {
          kind: 'callout',
          variant: 'info',
          spans: [{ bold: 'Ticked the wrong one?' }, ' Tap the circle again. It comes straight back.'],
        },
      ],
    },
    {
      id: 'change-task',
      title: 'Change a task',
      blocks: [
        {
          kind: 'para',
          spans: [
            'Tap the ',
            { bold: 'words' },
            ' of a task — not the circle — to open it. Here you can add a note, add a due date, and tap Save changes.',
          ],
        },
        { kind: 'image', shot: '07-task-details', caption: 'Notes and due dates are optional.' },
        {
          kind: 'para',
          spans: [
            { bold: 'Mark complete' },
            ' is the same as ticking the circle. ',
            { bold: 'Delete task' },
            ' throws it away completely.',
          ],
        },
        {
          kind: 'callout',
          variant: 'warn',
          spans: [
            { bold: 'Deleting cannot be undone' },
            ' — that is why the button is red. To leave without changing anything, tap the arrow at the top left.',
          ],
        },
      ],
    },
    {
      id: 'history',
      title: 'Find things you finished',
      blocks: [
        {
          kind: 'para',
          spans: [
            'Tap ',
            { bold: 'History' },
            ' at the bottom. Everything you have finished lives here, newest first, with the day and time you did it.',
          ],
        },
        {
          kind: 'bullets',
          items: [
            ['↺ puts a task back on your to-do list.'],
            ['🗑 removes it forever.'],
          ],
        },
        { kind: 'image', shot: '08-history', caption: 'Finished tasks, newest at the top.' },
        {
          kind: 'callout',
          variant: 'warn',
          spans: [
            { bold: 'Delete all' },
            ' empties the whole history in one go. It asks you first, because this cannot be undone.',
          ],
        },
      ],
    },
    {
      id: 'group-page',
      title: 'Open the Group page',
      part: 'Part 2 — You and other people',
      blocks: [
        {
          kind: 'lead',
          spans: [
            'Everything above still works the same. This part only adds to it. A group is a small set of people — your family, or a small team — who can ask each other to do things.',
          ],
        },
        {
          kind: 'callout',
          variant: 'info',
          spans: [
            { bold: 'Your own list stays private.' },
            ' Nobody else in the group can ever see it. The only things anybody else sees are the ones you specifically ask them to do.',
          ],
        },
        {
          kind: 'para',
          spans: ['Tap ', { bold: 'Group' }, ' at the bottom. You only need one of the two buttons:'],
        },
        {
          kind: 'bullets',
          items: [
            [{ bold: 'Create a group' }, ' — you are the first one. Pick this if you are setting it up.'],
            [{ bold: 'Join a group' }, ' — somebody already made one and gave you a code.'],
          ],
        },
        { kind: 'image', shot: '09-group-solo', caption: 'Before you have a group.' },
      ],
    },
    {
      id: 'make-group',
      title: 'Make your group',
      blocks: [
        {
          kind: 'bullets',
          items: [
            [{ bold: 'Give it a name.' }, ' Anything you will recognise.'],
            [{ bold: 'Family or Team?' }, ' Pick one. It only changes the words in the next list.'],
            [
              { bold: 'Your role.' },
              ' A Family offers Father, Mother, Guardian, Child, Other. A Team offers Leader and Member.',
            ],
            ['Tap ', { bold: 'Create group' }, '.'],
          ],
        },
        { kind: 'image', shot: '10-create-group', caption: 'Four things, top to bottom.' },
        { kind: 'para', spans: ['The group exists, and right now you are the only one in it.'] },
      ],
    },
    {
      id: 'invite-code',
      title: 'Give out your code',
      blocks: [
        {
          kind: 'para',
          spans: [
            'Your group now has a ',
            { bold: 'code' },
            ' — eight letters and numbers. This is how somebody joins, and nobody can get in without it.',
          ],
        },
        {
          kind: 'para',
          spans: [
            'Tap ',
            { bold: 'Share' },
            ' to send it by message or email. Reading it out loud works just as well.',
          ],
        },
        { kind: 'image', shot: '11-invite-code', caption: 'Your group’s invite code.' },
        {
          kind: 'callout',
          variant: 'info',
          spans: [
            'A code never uses a zero, a letter O, a one, or a letter I. That is on purpose, so nobody mixes them up.',
          ],
        },
      ],
    },
    {
      id: 'join-code',
      title: 'They type in the code',
      blocks: [
        {
          kind: 'lead',
          spans: ['The next two steps happen on the other person’s phone, not yours.'],
        },
        {
          kind: 'para',
          spans: [
            'They install Goodlist, make their own account, then tap ',
            { bold: 'Group' },
            ', then ',
            { bold: 'Join a group' },
            '. They type the code you gave them and tap Continue.',
          ],
        },
        { kind: 'image', shot: '12-join-code', caption: 'On their phone, not yours.' },
      ],
    },
    {
      id: 'join-role',
      title: 'They pick who they are',
      blocks: [
        {
          kind: 'para',
          spans: [
            'The app shows them the group name so they know it is the right one. They pick their own role and tap ',
            { bold: 'Join group' },
            '.',
          ],
        },
        { kind: 'image', shot: '13-join-role', caption: 'Everybody picks their own role.' },
        {
          kind: 'para',
          spans: [
            'You are now in a group together, and both of you will see the other person’s name on the Group page.',
          ],
        },
      ],
    },
    {
      id: 'two-tabs',
      title: 'Your list now has two parts',
      blocks: [
        {
          kind: 'para',
          spans: ['Go back to ', { bold: 'Tasks' }, '. There are two words at the top now.'],
        },
        {
          kind: 'bullets',
          items: [
            [{ bold: 'Personal' }, ' — your own list, exactly as before. Still private, still only yours.'],
            [{ bold: 'Requested' }, ' — things you and your group have asked each other to do.'],
          ],
        },
        {
          kind: 'para',
          spans: [
            'The name at the very top changed too: instead of Solo mode it now shows your group’s name.',
          ],
        },
        { kind: 'image', shot: '14-requested-tab', caption: 'The same typing box, new wording.' },
      ],
    },
    {
      id: 'ask-someone',
      title: 'Ask someone to do something',
      blocks: [
        {
          kind: 'para',
          spans: [
            'Tap ',
            { bold: 'Requested' },
            ', type what you would like them to do, and tap the green arrow.',
          ],
        },
        { kind: 'image', shot: '15-request-sent', caption: '“To Alex” means you asked Alex.' },
        {
          kind: 'para',
          spans: [
            'Tap it to add a note or a due date, just like before. Changed your mind? Open it and tap ',
            { bold: 'Cancel request' },
            '.',
          ],
        },
        {
          kind: 'callout',
          variant: 'info',
          spans: [
            { bold: 'More than one other person in your group?' },
            ' A row of names appears above the typing box. Tap a name first, then type — that is how the app knows who you mean.',
          ],
        },
      ],
    },
    {
      id: 'what-they-see',
      title: 'What they see',
      blocks: [
        { kind: 'para', spans: ['On the other person’s phone, the same task looks like this:'] },
        {
          kind: 'bullets',
          items: [
            [
              'A ',
              { bold: 'red number' },
              ' appears on the Tasks button — how many new requests they have. It disappears once they look.',
            ],
            ['The task says ', { bold: 'From' }, ' and your name, so they know who asked.'],
            ['They tick the circle when it is done.'],
          ],
        },
        { kind: 'image', shot: '16-their-inbox', caption: 'A red 2, and who it came from.' },
        {
          kind: 'para',
          spans: [
            'The moment they tick it, it leaves your Requested list and lands in History for both of you. You do not have to refresh anything.',
          ],
        },
      ],
    },
  ],
  extras: [
    {
      id: 'nice-to-know',
      title: 'Nice to know',
      blocks: [
        { kind: 'para', spans: ['None of this is essential. It is here when you want it.'] },
        {
          kind: 'bullets',
          items: [
            [
              { bold: 'Display name' },
              ' is what other people in your group see. Change it in Settings and tap Save.',
            ],
            [
              { bold: 'Theme' },
              ' changes all the colours — there are nine. Nothing else changes, so pick whichever you like looking at.',
            ],
            [
              { bold: 'The privacy switch' },
              ' decides whether your country counts towards the “where is Goodlist used” numbers. It uses your phone’s time zone, never your actual location.',
            ],
          ],
        },
        { kind: 'image', shot: '17-settings', caption: 'Settings: your name, colours, privacy.' },
        {
          kind: 'bullets',
          items: [
            [
              { bold: 'No internet? Keep going.' },
              ' Add tasks and tick them off as normal. A small message says you are offline, and everything saves once your signal is back.',
            ],
            [{ bold: 'Two groups, no more.' }, ' A family group and a work team, but that is the limit.'],
            [
              { bold: 'Who can delete what.' },
              ' Only the person who made a task can delete it. If somebody asked you to do something you can finish it or un-finish it, but not throw it away — it is theirs.',
            ],
            [
              { bold: 'Who is in charge of a group.' },
              ' Whoever made it. That person can rename it, remove somebody, or hand the job over with Make owner. Everybody else can simply leave.',
            ],
          ],
        },
      ],
    },
    {
      id: 'something-wrong',
      title: 'If something goes wrong',
      blocks: [
        {
          kind: 'para',
          spans: [
            { bold: 'It says the invite code is invalid.' },
            ' Check every character and type it again slowly. There is never a zero or a letter O in a code. If it still will not work, ask for a fresh copy.',
          ],
        },
        {
          kind: 'para',
          spans: [
            { bold: 'You tapped a circle by accident.' },
            ' Tap it again and it comes back. If you already left the page, go to History and tap ↺.',
          ],
        },
        {
          kind: 'para',
          spans: [
            { bold: 'You cannot see a friend’s tasks.' },
            ' That is correct — you are not meant to. You only ever see the things somebody has specifically asked you to do.',
          ],
        },
        {
          kind: 'para',
          spans: [
            { bold: 'The Requested tab is missing.' },
            ' It only appears once you are in a group. Go to Group and create or join one.',
          ],
        },
        {
          kind: 'para',
          spans: [
            { bold: 'You cannot delete your account.' },
            ' If you own a group that still has other people in it, Goodlist stops you — otherwise you would take their group away. Hand it over with Make owner, or remove the other members first.',
          ],
        },
        {
          kind: 'callout',
          variant: 'info',
          spans: [
            'Almost nothing in Goodlist is permanent. Anything you tick can be un-ticked, and anything you delete asks you first.',
          ],
        },
      ],
    },
  ],
};
