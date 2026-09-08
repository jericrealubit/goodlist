import { LegalDocument } from '@/components/legal-document';
import { privacyPolicy } from '@/content/legal';

export default function PrivacyScreen() {
  return <LegalDocument doc={privacyPolicy} />;
}
