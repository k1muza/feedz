import { FeedFormulationEditor } from "@/components/feed-formulation-editor";
import { feedFormulationEditorOptions } from "@/lib/feed-formulation-options";

export default async function EditFeedFormulationPage({
  params,
}: {
  params: Promise<{ formulationId: string }>;
}) {
  const { formulationId } = await params;
  const options = await feedFormulationEditorOptions();
  return <FeedFormulationEditor {...options} formulationId={formulationId} />;
}
