import { FeedFormulationEditor } from "@/components/feed-formulation-editor";
import { feedFormulationEditorOptions } from "@/lib/feed-formulation-options";

export default function NewFeedFormulationPage() {
  const options = feedFormulationEditorOptions();
  return <FeedFormulationEditor {...options} />;
}
