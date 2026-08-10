/** Warm the lazy 3D runtime chunk in parallel with the model fetch. */
export function preloadSceneModule() {
  return import('./SpineScene');
}
