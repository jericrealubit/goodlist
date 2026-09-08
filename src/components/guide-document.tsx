import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

import { Clause, LegalBlock, LegalScreen } from '@/components/legal-document';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTokens } from '@/hooks/use-tokens';
import type { GuideBlock, GuideDoc, ShotName } from '@/content/guide';

/**
 * The bundled screenshots, keyed by the names src/content/guide.ts uses.
 * Written by `npm run guide:screens` — the same images as the Markdown guide
 * in docs/user-guide/. Listed statically because the bundler has to see every
 * `require()` at build time; a computed path would resolve to nothing.
 */
const SHOTS: Record<ShotName, number> = {
  '01-create-account': require('@/assets/images/guide/01-create-account.png'),
  '02-log-in': require('@/assets/images/guide/02-log-in.png'),
  '03-solo-empty': require('@/assets/images/guide/03-solo-empty.png'),
  '04-first-task': require('@/assets/images/guide/04-first-task.png'),
  '05-my-list': require('@/assets/images/guide/05-my-list.png'),
  '06-swipe-done': require('@/assets/images/guide/06-swipe-done.png'),
  '07-task-details': require('@/assets/images/guide/07-task-details.png'),
  '08-history': require('@/assets/images/guide/08-history.png'),
  '09-group-solo': require('@/assets/images/guide/09-group-solo.png'),
  '10-create-group': require('@/assets/images/guide/10-create-group.png'),
  '11-invite-code': require('@/assets/images/guide/11-invite-code.png'),
  '12-join-code': require('@/assets/images/guide/12-join-code.png'),
  '13-join-role': require('@/assets/images/guide/13-join-role.png'),
  '14-requested-tab': require('@/assets/images/guide/14-requested-tab.png'),
  '15-request-sent': require('@/assets/images/guide/15-request-sent.png'),
  '16-their-inbox': require('@/assets/images/guide/16-their-inbox.png'),
  '17-settings': require('@/assets/images/guide/17-settings.png'),
};

/** One phone screenshot, sized so it still reads as a phone inside the page. */
function Shot({ shot, caption }: { shot: ShotName; caption: string }) {
  const theme = useTheme();
  const tokens = useTokens();
  return (
    <ThemedView style={styles.shot}>
      <Image
        source={SHOTS[shot]}
        // The screenshots share the app's own background, so without an edge
        // they bleed into the page instead of reading as a picture of a phone.
        style={[styles.shotImage, { borderRadius: tokens.radii.lg, borderColor: theme.border }]}
        contentFit="contain"
        accessibilityLabel={caption}
      />
      <ThemedText type="small" themeColor="textSecondary" style={styles.shotCaption}>
        {caption}
      </ThemedText>
    </ThemedView>
  );
}

function Block({ block }: { block: GuideBlock }) {
  // Every other kind is shared with the legal documents, which is why the
  // guide's spans are deliberately a subset of theirs.
  return block.kind === 'image' ? (
    <Shot shot={block.shot} caption={block.caption} />
  ) : (
    <LegalBlock block={block} />
  );
}

export function GuideDocument({ doc }: { doc: GuideDoc }) {
  return (
    <LegalScreen title={doc.title} subtitle={doc.subtitle}>
      <ThemedView style={styles.intro}>
        {doc.intro.map((block, index) => (
          <Block key={index} block={block} />
        ))}
      </ThemedView>

      {doc.steps.map((step, index) => (
        <ThemedView key={step.id} style={styles.step}>
          {step.part ? (
            <ThemedText type="smallBold" themeColor="accent" style={styles.part}>
              {step.part}
            </ThemedText>
          ) : null}
          <Clause number={index + 1} title={step.title}>
            {step.blocks.map((block, blockIndex) => (
              <Block key={blockIndex} block={block} />
            ))}
          </Clause>
        </ThemedView>
      ))}

      {doc.extras.map((section) => (
        <Clause key={section.id} title={section.title}>
          {section.blocks.map((block, index) => (
            <Block key={index} block={block} />
          ))}
        </Clause>
      ))}

      <ThemedText type="small" themeColor="textSecondary">
        The pictures show the app in its default Minimal Sage colours. If you picked a different
        theme your screens will be different colours, but everything sits in the same place.
      </ThemedText>
    </LegalScreen>
  );
}

const styles = StyleSheet.create({
  intro: {
    gap: Spacing.three,
  },
  step: {
    gap: Spacing.two,
  },
  part: {
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  shot: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  shotImage: {
    width: '100%',
    maxWidth: 260,
    borderWidth: 1,
    // The screens are shot at 390x844 (see scripts/generate-guide-screens.mjs).
    aspectRatio: 390 / 844,
  },
  shotCaption: {
    textAlign: 'center',
  },
});
