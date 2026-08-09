import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { Box3, Vector3, type Group, type Material, type Mesh } from 'three';
import type { ViewToggles } from '../types';
import { classifySceneNode, LUMBAR_FUSION_GLB_URL } from './sceneAssetConfig';
import { GlbSceneLayoutProvider, type GlbSceneLayout } from './GlbSceneLayoutContext';

interface GlbLumbarSceneProps {
  toggles: Pick<ViewToggles, 'anatomyOpacity' | 'cage' | 'pedicleScrews'>;
  children?: React.ReactNode;
}

interface GroupedMeshes {
  spine: Mesh[];
  cage: Mesh[];
  pedicleScrews: Mesh[];
  all: Mesh[];
}

function cloneSceneGraph(source: Group): Group {
  return source.clone(true);
}

function getMeshWorldCenter(mesh: Mesh): [number, number, number] {
  mesh.updateWorldMatrix(true, false);
  const box = new Box3().setFromObject(mesh);
  const center = box.getCenter(new Vector3());
  return [center.x, center.y, center.z];
}

function buildSceneLayout(root: Group, grouped: GroupedMeshes): GlbSceneLayout {
  const spineCenters: Record<string, [number, number, number]> = {};
  for (const mesh of grouped.spine) {
    spineCenters[mesh.name] = getMeshWorldCenter(mesh);
  }

  return {
    root,
    spineCenters,
    cageCenter: grouped.cage[0] ? getMeshWorldCenter(grouped.cage[0]) : null,
    screwCenters: grouped.pedicleScrews.map((mesh) => getMeshWorldCenter(mesh)),
    focusMeshes: grouped.all,
  };
}

function collectGroupedMeshes(root: Group): GroupedMeshes {
  const grouped: GroupedMeshes = {
    spine: [],
    cage: [],
    pedicleScrews: [],
    all: [],
  };

  root.traverse((object) => {
    if (!('isMesh' in object) || !(object as Mesh).isMesh) return;

    const mesh = object as Mesh;
    grouped.all.push(mesh);
    const group = classifySceneNode(mesh.name);
    if (group === 'spine') grouped.spine.push(mesh);
    if (group === 'cage') grouped.cage.push(mesh);
    if (group === 'pedicleScrew') grouped.pedicleScrews.push(mesh);
  });

  return grouped;
}

function applyMaterialOpacity(materials: Material | Material[] | undefined, opacity: number) {
  if (!materials) return;

  const list = Array.isArray(materials) ? materials : [materials];
  for (const material of list) {
    material.transparent = opacity < 1;
    material.opacity = opacity;
    material.depthWrite = opacity >= 0.05;
    material.needsUpdate = true;
  }
}

function setMeshesVisible(meshes: Mesh[], visible: boolean) {
  for (const mesh of meshes) {
    mesh.visible = visible;
  }
}

export function GlbLumbarScene({ toggles, children }: GlbLumbarSceneProps) {
  const { scene } = useGLTF(LUMBAR_FUSION_GLB_URL);

  const { root, groupedMeshes, layout } = useMemo(() => {
    const cloned = cloneSceneGraph(scene);
    const grouped = collectGroupedMeshes(cloned);
    return {
      root: cloned,
      groupedMeshes: grouped,
      layout: buildSceneLayout(cloned, grouped),
    };
  }, [scene]);

  useEffect(() => {
    for (const mesh of groupedMeshes.spine) {
      applyMaterialOpacity(mesh.material, toggles.anatomyOpacity);
    }
  }, [groupedMeshes.spine, toggles.anatomyOpacity]);

  useEffect(() => {
    const spineVisible = toggles.anatomyOpacity > 0;
    setMeshesVisible(groupedMeshes.spine, spineVisible);
    setMeshesVisible(groupedMeshes.cage, toggles.cage);
    setMeshesVisible(groupedMeshes.pedicleScrews, toggles.pedicleScrews);
  }, [
    groupedMeshes,
    toggles.anatomyOpacity,
    toggles.cage,
    toggles.pedicleScrews,
  ]);

  return (
    <GlbSceneLayoutProvider value={layout}>
      <primitive object={root} />
      {children}
    </GlbSceneLayoutProvider>
  );
}

useGLTF.preload(LUMBAR_FUSION_GLB_URL);
