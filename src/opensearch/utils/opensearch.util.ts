const CHUNK = 20_000;
const OVERLAP = 200;

const flattenToTextValues = (
  node: unknown,
  out: Set<string>,
  depth = 0,
): void => {
  if (node == null || typeof node === "boolean") return;

  if (Array.isArray(node)) {
    node.forEach((item) => flattenToTextValues(item, out, depth));
    return;
  }

  if (typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      out.add(key);
      flattenToTextValues(value, out, depth + 1);
    }
    return;
  }

  const s = String(node);
  if (s.length) out.add(s);
};

const chunkWithOverlap = (text: string): string[] => {
  if (text.length <= CHUNK) return [text];

  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += CHUNK - OVERLAP) {
    chunks.push(text.slice(i, i + CHUNK));
  }
  return chunks;
};

export const flattenScientificMetadata = (sm: unknown): string[] => {
  const out = new Set<string>();
  flattenToTextValues(sm, out);

  return chunkWithOverlap([...out].join(" "));
};

export const toOpensearchDocument = <T extends Record<string, unknown>>(
  doc: T,
) => {
  return {
    ...doc,
    scientificMetadataText: flattenScientificMetadata(doc.scientificMetadata),
  };
};
