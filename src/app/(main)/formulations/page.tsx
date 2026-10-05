import FormulationsClient from './FormulationsClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Custom Feed Formulations',
  description: 'Discover how FeedSport formulates precise diets for optimal livestock performance.',
  alternates: {
    canonical: '/formulations',
  },
};

export default function FormulationsPage() {
  return <FormulationsClient />;
}
