// Типографика постов на рендере: .mdx не меняются, код не трогается.

import { typographize } from '../utils/typography.mjs';

const OPAQUE = new Set(['code', 'inlineCode', 'html', 'mdxjsEsm']);

export default function remarkTypography() {
  return (tree) => {
    const walk = (node) => {
      if (!node || OPAQUE.has(node.type)) return;

      if (node.type === 'text' && typeof node.value === 'string') {
        node.value = typographize(node.value);
        return;
      }

      if (Array.isArray(node.children)) {
        node.children.forEach(walk);
      }
    };

    walk(tree);
  };
}
