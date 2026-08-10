import { useGLTF } from '@react-three/drei';

/** Begin downloading the GLB before the Canvas mounts. */
export function preloadLumbarModel(url: string) {
  useGLTF.preload(url);
}

/** Warm the lazy 3D runtime chunk in parallel with the model fetch. */
export function preloadSceneModule() {
  return import('./SpineScene');
}
