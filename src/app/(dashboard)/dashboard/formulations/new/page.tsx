import { FeedFormulationEditor } from "@/components/feed-formulation-editor";
import { feedFormulationEditorOptions } from "@/lib/feed-formulation-options";

export default async function NewFeedFormulationPage() {
  const options = await feedFormulationEditorOptions();
  return <FeedFormulationEditor {...options} />;
}
