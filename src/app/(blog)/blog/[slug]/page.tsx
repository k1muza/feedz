import { permanentRedirect } from 'next/navigation';

export default function LegacyArticlePage() {
  permanentRedirect('/knowledge');
}
