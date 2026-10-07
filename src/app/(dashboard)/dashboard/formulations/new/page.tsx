import { FeedFormulationEditor } from "@/components/feed-formulation-editor";
import { feedFormulationEditorOptions } from "@/lib/feed-formulation-options";

export const dynamic = "force-dynamic";

export default async function NewFeedFormulationPage() {
  const options = await feedFormulationEditorOptions();
  return <FeedFormulationEditor {...options} />;
}
