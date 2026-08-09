export const LUMBAR_FUSION_GLB_URL = '/models/lumbar-fusion.glb';

export type SceneElementGroup = 'spine' | 'cage' | 'pedicleScrew';

const SPINE_PATTERN = /^(t11|t12|sacrum|l1|l2|l3|l4|l5|s1)/;

function normalizeNodeName(name: string): string {
  return name.toLowerCase().replace(/\.stl$/i, '').replace(/[^a-z0-9]/g, '');
}

export function classifySceneNode(name: string): SceneElementGroup | null {
  const normalized = normalizeNodeName(name);

  if (SPINE_PATTERN.test(normalized)) return 'spine';
  if (normalized.includes('cage')) return 'cage';
  if (normalized.includes('pedicle') && normalized.includes('screw')) return 'pedicleScrew';
  if (normalized.startsWith('pediclescrew')) return 'pedicleScrew';

  return null;
}

export function getSpineLabel(name: string): string {
  const normalized = normalizeNodeName(name);
  const match = normalized.match(SPINE_PATTERN);
  if (match) return match[1].toUpperCase();
  return name.replace(/\.stl$/i, '').toUpperCase();
}
