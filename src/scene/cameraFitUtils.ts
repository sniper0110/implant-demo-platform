import { Box3, MathUtils, Vector3, type Mesh, type Object3D, type PerspectiveCamera } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { SceneMode } from '../types';
import { classifySceneNode } from './sceneAssetConfig';

export function getFitObjects(root: Object3D, sceneMode: SceneMode, focusMeshes: Object3D[]): Object3D[] {
  switch (sceneMode) {
    case 'interbody-cage': {
      const cageObjects = focusMeshes.filter((obj) => classifySceneNode(obj.name) === 'cage' && obj.visible);
      const spineObjects = focusMeshes.filter((obj) => classifySceneNode(obj.name) === 'spine' && obj.visible);
      const combined = [...spineObjects, ...cageObjects];
      return combined.length > 0 ? combined : cageObjects.length > 0 ? cageObjects : [root];
    }
    case 'pedicle-system': {
      const screwObjects = focusMeshes.filter((obj) => classifySceneNode(obj.name) === 'pedicleScrew' && obj.visible);
      const spineObjects = focusMeshes.filter((obj) => classifySceneNode(obj.name) === 'spine' && obj.visible);
      const combined = [...spineObjects, ...screwObjects];
      return combined.length > 0 ? combined : screwObjects.length > 0 ? screwObjects : [root];
    }
    case 'full-construct':
    default: {
      const visible = focusMeshes.filter((obj) => obj.visible);
      return visible.length > 0 ? visible : focusMeshes.length > 0 ? focusMeshes : [root];
    }
  }
}

function expandVisibleBounds(box: Box3, object: Object3D) {
  object.traverse((child) => {
    if (!child.visible) return;
    if ('isMesh' in child && (child as Mesh).isMesh) {
      box.expandByObject(child);
    }
  });
}

const CAMERA_FIT_PADDING: Record<SceneMode, number> = {
  'full-construct': 1.75,
  'interbody-cage': 1.55,
  'pedicle-system': 1.7,
  vad: 1.65,
};

export function computeCameraFitDistance(
  camera: PerspectiveCamera,
  size: Vector3,
  padding: number,
): number {
  const maxSize = Math.max(size.x, size.y, size.z, 1);
  const halfFov = MathUtils.degToRad(camera.fov) / 2;
  const fitHeightDistance = maxSize / (2 * Math.tan(halfFov));
  const fitWidthDistance = fitHeightDistance / Math.max(camera.aspect, 0.25);
  return Math.max(fitHeightDistance, fitWidthDistance) * padding;
}

/**
 * Unit direction from scene center toward the camera position.
 * After the GLB −90° X rotation, +Z is anterior and −Z is posterior.
 */
export function getCameraOffset(sceneMode: SceneMode): Vector3 {
  switch (sceneMode) {
    case 'interbody-cage':
      // Anterior-lateral — disc space and cage footprint.
      return new Vector3(0.48, 0.24, 0.9);
    case 'pedicle-system':
      // Right posterior-elevated — exposes screw heads, rods, and connectors.
      return new Vector3(0.72, 0.42, -0.98);
    case 'full-construct':
    default:
      // Left lateral-oblique overview: bodies toward +Z (screen-left), posterior hardware toward −Z.
      return new Vector3(-0.86, 0.24, 0.42);
  }
}

export function fitCameraToObjects(
  objects: Object3D[],
  camera: PerspectiveCamera,
  controls: OrbitControlsImpl | null,
  sceneMode: SceneMode,
) {
  const box = new Box3();
  for (const object of objects) {
    expandVisibleBounds(box, object);
  }

  if (box.isEmpty()) return;

  const center = box.getCenter(new Vector3());
  const size = box.getSize(new Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 1);
  const padding = CAMERA_FIT_PADDING[sceneMode] ?? CAMERA_FIT_PADDING['full-construct'];
  const direction = getCameraOffset(sceneMode).normalize();
  const distance = computeCameraFitDistance(camera, size, padding);

  camera.position.copy(center.clone().add(direction.multiplyScalar(distance)));
  camera.near = Math.max(maxDim / 500, 0.01);
  camera.far = Math.max(distance * 8, maxDim * 20, 1000);
  camera.updateProjectionMatrix();
  camera.lookAt(center);

  if (controls) {
    controls.target.copy(center);
    controls.minDistance = distance * 0.25;
    controls.maxDistance = distance * 5;
    controls.update();
  }
}
