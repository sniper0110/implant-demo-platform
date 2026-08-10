import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import type { Group, Object3D, PerspectiveCamera } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { SceneMode } from '../types';
import { fitCameraToObjects, getFitObjects } from './cameraFitUtils';

interface GlbCameraFitProps {
  root: Group;
  sceneMode: SceneMode;
  focusMeshes: Object3D[];
}

export function GlbCameraFit({ root, sceneMode, focusMeshes }: GlbCameraFitProps) {
  const { camera, controls, invalidate } = useThree();

  useEffect(() => {
    const objects = getFitObjects(root, sceneMode, focusMeshes);
    fitCameraToObjects(
      objects,
      camera as PerspectiveCamera,
      controls as OrbitControlsImpl | null,
      sceneMode,
    );
    invalidate();
  }, [root, sceneMode, focusMeshes, camera, controls, invalidate]);

  return null;
}
