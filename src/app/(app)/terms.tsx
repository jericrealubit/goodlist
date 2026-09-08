import { LegalDocument } from '@/components/legal-document';
import { termsOfService } from '@/content/legal';

export default function TermsScreen() {
  return <LegalDocument doc={termsOfService} />;
}
