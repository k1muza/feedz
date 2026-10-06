import { redirect } from 'next/navigation';

export default async function EditIngredientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/ingredients/${id}`);
}
