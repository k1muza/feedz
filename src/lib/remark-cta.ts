import type { Blockquote, Root } from 'mdast';

// A top-level blockquote that opens with [!CTA] is a call-to-action box. Keep links on their own line;
// the article page styles them as buttons.
//
//   > [!CTA]
//   > **Heading**
//   >
//   > One or two sentences.
//   >
//   > [Button label](https://wa.me/...)
const MARKER = '[!CTA]';

export const isCta = (node: Blockquote) => node.data?.hName === 'aside';

export default function remarkCta() {
  return (tree: Root) => {
    for (const node of tree.children) {
      if (node.type !== 'blockquote') continue;
      const first = node.children[0];
      const lead = first?.type === 'paragraph' ? first.children[0] : undefined;
      if (first?.type !== 'paragraph' || lead?.type !== 'text' || !lead.value.startsWith(MARKER)) continue;
      lead.value = lead.value.slice(MARKER.length).trimStart();
      if (!lead.value) first.children.shift();
      if (!first.children.length) node.children.shift();
      node.data = { ...node.data, hName: 'aside' };
    }
  };
}
