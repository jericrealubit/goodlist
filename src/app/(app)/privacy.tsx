import { Bold, Bullets, Callout, Clause, ContactEmail, LeadPara, LegalScreen, Para } from '@/components/legal-document';

export default function PrivacyScreen() {
  return (
    <LegalScreen title="Privacy Policy">
      <Clause number={1} title="Who this covers">
        <Para>
          This policy applies to everyone who uses Goodlist — the task and household-sharing app built
          by an independent developer, Jeric Realubit. Goodlist runs on Supabase (Postgres +
          authentication) as its backend infrastructure. We don&apos;t run ads, and we don&apos;t use
          analytics or tracking SDKs of any kind in the app today.
        </Para>
      </Clause>

      <Clause number={2} title="What we collect">
        <Para>
          <Bold>Account information.</Bold> Your email address and password (stored securely and
          hashed by our authentication provider — we never see it in plain text), and an optional
          display name.
        </Para>
        <Para>
          <Bold>Task &amp; household content.</Bold> Anything you enter to use the app: task titles,
          notes, due dates, completion status, household or group names, invite codes, and member
          roles. This is the content the app exists to store.
        </Para>
        <Para>
          <Bold>Activity timestamp.</Bold> While the app is open, it records a single
          &quot;last seen&quot; time on your profile, roughly once a minute. It is one timestamp,
          overwritten each time — not a history of when or how you use the app — and it exists only
          so the app can show how many people are using Goodlist right now. Other users see that
          count, never your timestamp, your name, or anything you do.
        </Para>
        <Para>
          <Bold>Country &amp; time zone.</Bold> Your device&apos;s Region setting (a country, like
          &quot;Philippines&quot;) and its time zone (like &quot;Asia/Manila&quot;). These are read
          from your device&apos;s own language and region settings — <Bold>not</Bold> from GPS, and
          not from your IP address. We use them only to count how many people use Goodlist in each
          country. You can turn this off at any time in Settings, which also clears the two values
          we&apos;ve stored.
        </Para>
        <LeadPara>
          We don&apos;t collect your precise location, contacts, or advertising identifiers, and we
          don&apos;t track you across other apps or websites. There&apos;s nothing being collected
          in the background beyond what&apos;s listed above.
        </LeadPara>
      </Clause>

      <Clause number={3} title="How we use it">
        <Bullets
          items={[
            'To create and authenticate your account, and keep you signed in.',
            'To sync your Personal tasks across your own devices.',
            "To share Requested tasks and Household task lists with the members you've chosen to invite.",
            'To send in-app notifications — for example, when someone requests a task from you.',
            'To show community totals — how many accounts exist, how many are active right now, and how many people use Goodlist solo or in a group. These are counts only; no one is identifiable from them.',
            'To count, in aggregate, how many people use Goodlist in each country — never to locate an individual.',
          ]}
        />
        <Para>We don&apos;t use your data to train models, sell it, or use it for advertising.</Para>
      </Clause>

      <Clause number={4} title="Sharing within your group">
        <Para>
          Goodlist is built around small, invite-only groups — Family or Team mode, up to two per
          account. If you join or create one, your display name and any tasks marked as shared or
          requested within that group become visible to the other members — that visibility is the
          point of the feature, and it&apos;s limited to people who joined using your group&apos;s
          invite code.
        </Para>
        <Para>
          Outside of your own household, we don&apos;t share your personal data with other users, and
          we don&apos;t share it with third parties for marketing or advertising purposes. Our
          infrastructure provider, Supabase, Inc., processes and stores data on our behalf as part of
          running the service — it doesn&apos;t use your data for its own purposes.
        </Para>
      </Clause>

      <Clause number={5} title="Retention & deletion">
        <Para>
          Your data is kept for as long as your account exists. You can permanently delete your
          account at any time from Settings — this immediately and permanently removes your profile
          and tasks.
        </Para>
        <Callout variant="warn">
          <Bold>If you own a group</Bold> (you created it) and other members still belong to it, we
          block account deletion until you transfer ownership to someone else or remove the other
          members first — so a deletion can&apos;t destroy a group out from under the people in it.
        </Callout>
        <Para>
          You can also clear your completed/cancelled task history from the History screen at any time,
          independent of deleting your account.
        </Para>
      </Clause>

      <Clause number={6} title="Children's privacy">
        <Para>
          Goodlist is not directed at children under 13, and we do not knowingly collect personal
          information from children under 13. Family-group member roles like &quot;child&quot; are
          currently descriptive labels only — Goodlist does not yet offer separate child accounts,
          logins, or parental-control features.
        </Para>
      </Clause>

      <Clause number={7} title="Security">
        <Para>
          Your data is protected with row-level database security, meaning the database itself enforces
          who can read or write each piece of data — a household&apos;s tasks are only reachable by
          that household&apos;s members, and personal tasks only by you. Passwords are hashed, never
          stored or transmitted in plain text. No method of storage or transmission is 100% secure, but
          we take reasonable, industry-standard steps to protect your information.
        </Para>
      </Clause>

      <Clause number={8} title="Your choices">
        <Bullets
          items={[
            <>
              <Bold>Access &amp; correction</Bold> — everything you&apos;ve entered is visible and
              editable directly in the app.
            </>,
            <>
              <Bold>Deletion</Bold> — delete your account anytime from Settings, or email us to request
              it.
            </>,
            <>
              <Bold>Questions or data requests</Bold> — contact us using the email below.
            </>,
          ]}
        />
      </Clause>

      <Clause number={9} title="Changes to this policy">
        <Para>
          If this policy changes in a meaningful way, we&apos;ll update the effective date above.
          Continuing to use Goodlist after a change means you accept the updated policy.
        </Para>
      </Clause>

      <Clause number={10} title="Contact">
        <Para>
          Questions about this policy or your data? Reach out at <ContactEmail />.
        </Para>
      </Clause>
    </LegalScreen>
  );
}
