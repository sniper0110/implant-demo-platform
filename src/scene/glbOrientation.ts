import { Box3, MathUtils, Vector3 } from 'three';
import type { Group, Mesh, Object3D } from 'three';

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

function expandVisibleMeshBounds(box: Box3, object: Object3D) {
  object.traverse((child) => {
    if (!child.visible) return;
    if ('isMesh' in child && (child as Mesh).isMesh) {
      box.expandByObject(child);
    }
  });
}

/** Moves the model root so the world-space center of the given meshes sits at the origin. */
export function centerModelOnMeshes(root: Group, meshes: Mesh[]) {
  const box = new Box3();
  for (const mesh of meshes) {
    expandVisibleMeshBounds(box, mesh);
  }
  if (box.isEmpty()) return;

  const worldCenter = box.getCenter(new Vector3());
  root.position.copy(worldCenter.negate());
  root.updateMatrixWorld(true);
}
