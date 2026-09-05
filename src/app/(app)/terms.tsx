import { Bullets, Callout, Clause, ContactEmail, LegalScreen, Para } from '@/components/legal-document';

export default function TermsScreen() {
  return (
    <LegalScreen title="Terms of Service">
      <Clause number={1} title="Acceptance">
        <Para>
          By creating a Goodlist account or using the app, you agree to these Terms of Service. If you
          don&apos;t agree, please don&apos;t use Goodlist.
        </Para>
      </Clause>

      <Clause number={2} title="The service">
        <Para>
          Goodlist is a task-management app for personal to-dos and household task sharing, including
          task requests between household members, completion history, and appearance customization. We
          may add, change, or remove features over time as the app evolves.
        </Para>
      </Clause>

      <Clause number={3} title="Your account">
        <Bullets
          items={[
            "You're responsible for keeping your login credentials confidential.",
            "You're responsible for the accuracy of the information you provide (like your email and display name).",
            'One account per person — don’t share your login with others.',
          ]}
        />
      </Clause>

      <Clause number={4} title="Households & sharing">
        <Para>
          Only invite people you trust to your household — they&apos;ll be able to see the display names
          and shared/requested tasks associated with that household. Anyone with your household&apos;s
          invite code can join it, so treat the code like you would a shared password.
        </Para>
        <Callout>
          As noted in the Privacy Policy: if you own a household with other members in it, you
          won&apos;t be able to delete your account until you transfer ownership or remove those members
          first.
        </Callout>
      </Clause>

      <Clause number={5} title="Acceptable use">
        <Para>
          Don&apos;t use Goodlist to store or share unlawful content, don&apos;t attempt to access
          another person&apos;s account or data without authorization, and don&apos;t abuse invite codes
          or the request/notification system to harass other users. We may suspend or remove accounts
          that violate this.
        </Para>
      </Clause>

      <Clause number={6} title="Your content">
        <Para>
          You own the tasks, notes, and other content you create in Goodlist. By using the app, you
          grant us the limited permission needed to store, sync, and display that content back to you —
          and, where you&apos;ve chosen to share it, to the members of your household.
        </Para>
      </Clause>

      <Clause number={7} title="Termination">
        <Para>
          You can stop using Goodlist and delete your account at any time from Settings. We may suspend
          or terminate accounts that violate these terms or where required by law.
        </Para>
      </Clause>

      <Clause number={8} title="No warranty; limitation of liability">
        <Para>
          Goodlist is provided &quot;as is,&quot; without warranties of any kind, express or implied,
          including uninterrupted availability. To the fullest extent permitted by law, we aren&apos;t
          liable for indirect, incidental, or consequential damages arising from your use of the app.
        </Para>
      </Clause>

      <Clause number={9} title="Changes to these terms">
        <Para>
          We may update these terms as Goodlist evolves. Material changes will update the effective date
          above. Continued use after a change means you accept the updated terms.
        </Para>
      </Clause>

      <Clause number={10} title="Contact">
        <Para>
          Questions about these terms? Reach out at <ContactEmail />.
        </Para>
      </Clause>
    </LegalScreen>
  );
}
