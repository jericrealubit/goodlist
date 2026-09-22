import { MedsView } from '@/components/meds/meds-view';
import { useTabScreenInsets } from '@/hooks/use-tab-screen-insets';

/** Thin, like the calendar tab: where the medicines view is placed stays a one-file decision. */
export default function MedsScreen() {
  const { topInset, bottomInset } = useTabScreenInsets();
  return <MedsView topInset={topInset} bottomInset={bottomInset} />;
}
