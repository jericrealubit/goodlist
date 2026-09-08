import { Fragment, type ReactNode } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  CONTACT_EMAIL,
  EFFECTIVE_DATE,
  type Block,
  type LegalDoc,
  type Span,
} from '@/content/legal';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTokens } from '@/hooks/use-tokens';

/**
 * Document shell shared by the legal screens and the user guide. `subtitle`
 * defaults to the legal effective date; the guide passes its own.
 */
export function LegalScreen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.six }]}>
        <ThemedView style={styles.header}>
          <ThemedText type="title">{title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {subtitle ?? `Effective ${EFFECTIVE_DATE}`}
          </ThemedText>
        </ThemedView>
        {children}
      </ScrollView>
    </ThemedView>
  );
}

export function Clause({
  number,
  title,
  children,
}: {
  /** Omitted for the guide's unnumbered trailing sections. */
  number?: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <ThemedView style={styles.clause}>
      <ThemedText type="header">
        {number === undefined ? title : `${number}. ${title}`}
      </ThemedText>
      {children}
    </ThemedView>
  );
}

export function Para({ children }: { children: ReactNode }) {
  return <ThemedText type="default">{children}</ThemedText>;
}

export function LeadPara({ children }: { children: ReactNode }) {
  return (
    <ThemedText type="small" themeColor="textSecondary">
      {children}
    </ThemedText>
  );
}

export function Bold({ children }: { children: ReactNode }) {
  return <ThemedText type="default" style={styles.bold}>{children}</ThemedText>;
}

export function Bullets({ items }: { items: ReactNode[] }) {
  const theme = useTheme();
  return (
    <ThemedView style={styles.bullets}>
      {items.map((item, index) => (
        <View key={index} style={styles.bulletRow}>
          <View style={[styles.bulletDot, { backgroundColor: theme.accent }]} />
          <ThemedText type="default" style={styles.bulletText}>
            {item}
          </ThemedText>
        </View>
      ))}
    </ThemedView>
  );
}

export function Callout({ children, variant = 'info' }: { children: ReactNode; variant?: 'info' | 'warn' }) {
  const theme = useTheme();
  const tokens = useTokens();
  const accent = variant === 'warn' ? theme.danger : theme.primary;
  return (
    <ThemedView
      type="backgroundElement"
      style={[
        styles.callout,
        {
          borderColor: accent,
          borderRadius: tokens.radii.md,
          borderLeftWidth: 3,
        },
      ]}>
      <ThemedText type="small">{children}</ThemedText>
    </ThemedView>
  );
}

export function ContactEmail() {
  return (
    <ThemedText
      type="link"
      themeColor="primary"
      onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}>
      {CONTACT_EMAIL}
    </ThemedText>
  );
}

/**
 * Renders a document from src/content/legal.ts. That module is shared with
 * `npm run legal:site`, which renders the same content as the public web
 * pages Google Play links to — so the policy a reviewer reads and the policy
 * in the app are the same text by construction.
 */
export function LegalDocument({ doc }: { doc: LegalDoc }) {
  return (
    <LegalScreen title={doc.title}>
      {doc.clauses.map((clause, index) => (
        <Clause key={clause.id} number={index + 1} title={clause.title}>
          {clause.blocks.map((block, blockIndex) => (
            <LegalBlock key={blockIndex} block={block} />
          ))}
        </Clause>
      ))}
    </LegalScreen>
  );
}

export function LegalBlock({ block }: { block: Block }) {
  switch (block.kind) {
    case 'para':
      return <Para>{renderSpans(block.spans)}</Para>;
    case 'lead':
      return <LeadPara>{renderSpans(block.spans)}</LeadPara>;
    case 'bullets':
      return <Bullets items={block.items.map((item) => renderSpans(item))} />;
    case 'callout':
      return <Callout variant={block.variant}>{renderSpans(block.spans)}</Callout>;
  }
}

function renderSpans(spans: Span[]) {
  return spans.map((span, index) => (
    <Fragment key={index}>
      {typeof span === 'string' ? span : 'bold' in span ? <Bold>{span.bold}</Bold> : <ContactEmail />}
    </Fragment>
  ));
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.five,
  },
  header: {
    gap: Spacing.two,
  },
  clause: {
    gap: Spacing.two,
  },
  bold: {
    fontWeight: '700',
  },
  bullets: {
    gap: Spacing.two,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  bulletText: {
    flex: 1,
  },
  callout: {
    padding: Spacing.three,
  },
});
