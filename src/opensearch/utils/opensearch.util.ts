const CHUNK = 20_000;
const OVERLAP = 200;

const flattenToTextValues = (node: unknown, out: string[], depth = 0): void => {
  if (node == null || typeof node === "boolean") return;

  if (Array.isArray(node)) {
    node.forEach((item) => flattenToTextValues(item, out, depth));
    return;
  }

  if (typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (depth === 0) out.push(key);
      flattenToTextValues(value, out, depth + 1);
    }
    return;
  }

  const s = String(node);
  if (s.length) out.push(s);
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
  const out: string[] = [];
  flattenToTextValues(sm, out);
  const text = out.join(" ");

  return chunkWithOverlap(text);
};
