import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Box3, Vector3, type Group, type Material, type Mesh } from 'three';
import type { ViewToggles } from '../types';
import { classifySceneNode, LUMBAR_FUSION_GLB_URL } from './sceneAssetConfig';
import { GlbSceneLayoutProvider, type GlbSceneLayout } from './GlbSceneLayoutContext';
import { applyDefaultModelOrientation } from './glbOrientation';

interface GlbLumbarSceneProps {
  toggles: Pick<ViewToggles, 'anatomyOpacity' | 'cage' | 'pedicleScrews'>;
  modelUrl?: string;
  detailModelUrl?: string;
  upgradeModelUrl?: string;
  allowDetailUpgrade?: boolean;
  allowIdleUpgrade?: boolean;
  onSceneLoaded?: () => void;
  onFirstFrame?: () => void;
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

function ModelLoadReporter({ onLoaded }: { onLoaded?: () => void }) {
  const reported = useRef(false);

  useEffect(() => {
    if (reported.current) return;
    reported.current = true;
    onLoaded?.();
  }, [onLoaded]);

  return null;
}

function FirstFrameReporter({ onFirstFrame }: { onFirstFrame?: () => void }) {
  const reported = useRef(false);

  useFrame(() => {
    if (reported.current) return;
    reported.current = true;
    onFirstFrame?.();
  });

  return null;
}

function LumbarSceneModel({
  url,
  toggles,
  onSceneLoaded,
  onFirstFrame,
  children,
}: {
  url: string;
  toggles: Pick<ViewToggles, 'anatomyOpacity' | 'cage' | 'pedicleScrews'>;
  onSceneLoaded?: () => void;
  onFirstFrame?: () => void;
  children?: React.ReactNode;
}) {
  const { scene } = useGLTF(url);
  const invalidate = useThree((state) => state.invalidate);

  const { root, groupedMeshes, layout } = useMemo(() => {
    const cloned = cloneSceneGraph(scene);
    applyDefaultModelOrientation(cloned);
    const grouped = collectGroupedMeshes(cloned);
    return {
      root: cloned,
      groupedMeshes: grouped,
      layout: buildSceneLayout(cloned, grouped),
    };
  }, [scene]);

  useEffect(() => {
    invalidate();
  }, [root, layout, invalidate]);

  useEffect(() => {
    for (const mesh of groupedMeshes.spine) {
      applyMaterialOpacity(mesh.material, toggles.anatomyOpacity);
    }
    invalidate();
  }, [groupedMeshes.spine, toggles.anatomyOpacity, invalidate]);

  useEffect(() => {
    const spineVisible = toggles.anatomyOpacity > 0;
    setMeshesVisible(groupedMeshes.spine, spineVisible);
    setMeshesVisible(groupedMeshes.cage, toggles.cage);
    setMeshesVisible(groupedMeshes.pedicleScrews, toggles.pedicleScrews);
    invalidate();
  }, [groupedMeshes, toggles.anatomyOpacity, toggles.cage, toggles.pedicleScrews, invalidate]);

  return (
    <GlbSceneLayoutProvider value={layout}>
      <primitive object={root} />
      <ModelLoadReporter onLoaded={onSceneLoaded} />
      <FirstFrameReporter onFirstFrame={onFirstFrame} />
      {children}
    </GlbSceneLayoutProvider>
  );
}

export function GlbLumbarScene({
  toggles,
  modelUrl = LUMBAR_FUSION_GLB_URL,
  detailModelUrl,
  upgradeModelUrl,
  allowDetailUpgrade = false,
  allowIdleUpgrade = false,
  onSceneLoaded,
  onFirstFrame,
  children,
}: GlbLumbarSceneProps) {
  const [activeUrl, setActiveUrl] = useState(modelUrl);
  const [upgraded, setUpgraded] = useState(false);
  const firstFrameSeen = useRef(false);

  useEffect(() => {
    setActiveUrl(modelUrl);
    setUpgraded(false);
    firstFrameSeen.current = false;
  }, [modelUrl]);

  useEffect(() => {
    if (!allowDetailUpgrade || !detailModelUrl || upgraded) return;

    const upgrade = () => {
      setActiveUrl(detailModelUrl);
      setUpgraded(true);
    };

    window.addEventListener('pointerdown', upgrade, { once: true });
    return () => window.removeEventListener('pointerdown', upgrade);
  }, [allowDetailUpgrade, detailModelUrl, upgraded]);

  const handleFirstFrame = () => {
    onFirstFrame?.();
    if (firstFrameSeen.current) return;
    firstFrameSeen.current = true;

    if (!allowIdleUpgrade || !upgradeModelUrl || upgraded || activeUrl === upgradeModelUrl) return;

    window.setTimeout(() => {
      if (upgraded || activeUrl === upgradeModelUrl) return;
      useGLTF.preload(upgradeModelUrl);
      setActiveUrl(upgradeModelUrl);
      setUpgraded(true);
    }, 5000);
  };

  return (
    <LumbarSceneModel
      url={activeUrl}
      toggles={toggles}
      onSceneLoaded={onSceneLoaded}
      onFirstFrame={handleFirstFrame}
    >
      {children}
    </LumbarSceneModel>
  );
}

export function preloadModel(url: string) {
  useGLTF.preload(url);
}
