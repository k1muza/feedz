import { Metadata } from 'next';
import ProductPage from '../[id]/page';

export const metadata: Metadata = {
  title: 'Sorghum',
  description: 'Sorghum feed ingredient specifications, packaging and minimum order information.',
  alternates: { canonical: '/products/sorghum' },
};

export default function SorghumPage() {
  return ProductPage({ params: Promise.resolve({ id: 'sorghum' }) });
}
