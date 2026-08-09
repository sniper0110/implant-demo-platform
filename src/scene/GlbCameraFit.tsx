import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Box3, Vector3, type Group, type Object3D, type PerspectiveCamera } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { SceneMode } from '../types';

import { classifySceneNode } from './sceneAssetConfig';

interface GlbCameraFitProps {
  root: Group;
  sceneMode: SceneMode;
  focusMeshes: Object3D[];
}

function getFitObjects(root: Group, sceneMode: SceneMode, focusMeshes: Object3D[]): Object3D[] {
  switch (sceneMode) {
    case 'interbody-cage': {
      const cageObjects = focusMeshes.filter((obj) => classifySceneNode(obj.name) === 'cage');
      return cageObjects.length > 0 ? cageObjects : [root];
    }
    case 'pedicle-system': {
      const screwObjects = focusMeshes.filter((obj) => classifySceneNode(obj.name) === 'pedicleScrew');
      return screwObjects.length > 0 ? screwObjects : [root];
    }
    case 'full-construct':
    default:
      return [root];
  }
}

function fitCameraToObjects(
  objects: Object3D[],
  camera: PerspectiveCamera,
  controls: OrbitControlsImpl | null,
  sceneMode: SceneMode
) {
  const box = new Box3();
  for (const object of objects) {
    box.expandByObject(object);
  }

  if (box.isEmpty()) return;

  const center = box.getCenter(new Vector3());
  const size = box.getSize(new Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 1);

  const offset =
    sceneMode === 'interbody-cage'
      ? new Vector3(maxDim * 0.55, maxDim * 0.15, maxDim * 0.85)
      : sceneMode === 'pedicle-system'
        ? new Vector3(-maxDim * 0.75, maxDim * 0.25, maxDim * 0.65)
        : new Vector3(maxDim * 0.2, maxDim * 0.25, maxDim * 0.95);

  camera.position.copy(center.clone().add(offset));
  camera.near = Math.max(maxDim / 500, 0.01);
  camera.far = Math.max(maxDim * 20, 1000);
  camera.updateProjectionMatrix();
  camera.lookAt(center);

  if (controls) {
    controls.target.copy(center);
    controls.minDistance = maxDim * 0.25;
    controls.maxDistance = maxDim * 4;
    controls.update();
  }
}

export function GlbCameraFit({ root, sceneMode, focusMeshes }: GlbCameraFitProps) {
  const { camera, controls } = useThree();

  useEffect(() => {
    const objects = getFitObjects(root, sceneMode, focusMeshes);
    fitCameraToObjects(objects, camera as PerspectiveCamera, controls as OrbitControlsImpl | null, sceneMode);
  }, [root, sceneMode, focusMeshes, camera, controls]);

  return null;
}
