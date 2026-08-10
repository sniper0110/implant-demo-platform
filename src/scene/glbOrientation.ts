import { MathUtils } from 'three';
import type { Group } from 'three';

/** Rotates the cloned GLB root so the lumbar construct lies horizontal (cranial left, caudal right). */
export const DEFAULT_MODEL_ROTATION = {
  x: MathUtils.degToRad(-90),
  y: 0,
  z: 0,
} as const;

export function applyDefaultModelOrientation(root: Group) {
  root.rotation.set(DEFAULT_MODEL_ROTATION.x, DEFAULT_MODEL_ROTATION.y, DEFAULT_MODEL_ROTATION.z);
  root.updateMatrixWorld(true);
}
