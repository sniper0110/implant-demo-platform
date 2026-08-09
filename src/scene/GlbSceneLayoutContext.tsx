import { createContext, useContext, type ReactNode } from 'react';
import type { Group, Object3D } from 'three';

export interface GlbSceneLayout {
  root: Group;
  spineCenters: Record<string, [number, number, number]>;
  cageCenter: [number, number, number] | null;
  screwCenters: [number, number, number][];
  focusMeshes: Object3D[];
}

const GlbSceneLayoutContext = createContext<GlbSceneLayout | null>(null);

export function GlbSceneLayoutProvider({
  value,
  children,
}: {
  value: GlbSceneLayout;
  children: ReactNode;
}) {
  return (
    <GlbSceneLayoutContext.Provider value={value}>{children}</GlbSceneLayoutContext.Provider>
  );
}

export function useGlbSceneLayout(): GlbSceneLayout {
  const layout = useContext(GlbSceneLayoutContext);
  if (!layout) {
    throw new Error('useGlbSceneLayout must be used within GlbSceneLayoutProvider');
  }
  return layout;
}
