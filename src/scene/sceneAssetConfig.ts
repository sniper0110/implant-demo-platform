export const LUMBAR_FUSION_GLB_URL = '/models/lumbar-fusion-initial.glb';
export const LUMBAR_FUSION_DETAIL_GLB_URL = '/models/lumbar-fusion-detail.glb';
export const LUMBAR_FUSION_MOBILE_GLB_URL = '/models/lumbar-fusion-mobile.glb';

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

export const REQUIRED_MESH_PATTERNS = [
  /^l4/i,
  /^l5/i,
  /cage/i,
  /pedicle/i,
];

export function validateRequiredMeshes(meshNames: string[]): string[] {
  const missing: string[] = [];
  for (const pattern of REQUIRED_MESH_PATTERNS) {
    if (!meshNames.some((name) => pattern.test(name))) {
      missing.push(pattern.source);
    }
  }
  return missing;
}
