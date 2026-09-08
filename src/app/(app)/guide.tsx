import { GuideDocument } from '@/components/guide-document';
import { userGuide } from '@/content/guide';

export default function GuideScreen() {
  return <GuideDocument doc={userGuide} />;
}
