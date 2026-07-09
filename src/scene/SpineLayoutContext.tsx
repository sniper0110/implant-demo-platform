import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useLoader } from '@react-three/fiber';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import type { BufferGeometry } from 'three';
import {
  SPINE_MESH_URLS,
  buildImplantAnchors,
  buildVertebraAnchors,
  computeSpineTransform,
  type VertebraAnchor,
} from './spineLayout';

export interface ImplantAnchors {
  interbody: {
    position: [number, number, number];
    endplateTop: [number, number, number];
    endplateBottom: [number, number, number];
  };
  pedicle: {
    levels: {
      left: [number, number, number];
      right: [number, number, number];
      y: number;
      z: number;
    }[];
    rodLeft: [number, number, number];
    rodRight: [number, number, number];
    crossConnector: [number, number, number];
  };
  cervical: {
    plateCenter: [number, number, number];
    screwPositions: [number, number, number][];
    vertebraLabel: [number, number, number];
  };
  vad: {
    target: [number, number, number];
    cannulaBase: [number, number, number];
  };
  labels: {
    vertebralBody: [number, number, number];
    discSpace: [number, number, number];
    endplate: [number, number, number];
  };
}

export interface SpineLayoutData {
  geometries: BufferGeometry[];
  transform: ReturnType<typeof computeSpineTransform>;
  anchors: VertebraAnchor[];
  implants: ImplantAnchors;
}

const SpineLayoutContext = createContext<SpineLayoutData | null>(null);

function useSpineLayoutData(): SpineLayoutData {
  const geometries = useLoader(STLLoader, [...SPINE_MESH_URLS]);

  return useMemo(() => {
    for (const geometry of geometries) {
      geometry.computeVertexNormals();
    }
    const transform = computeSpineTransform(geometries);
    // Compute anchors BEFORE baking the transform, since buildVertebraAnchors
    // applies the transform itself.
    const anchors = buildVertebraAnchors(geometries, transform);
    const implants = buildImplantAnchors(anchors);
    // Bake the transform (center offset + scale) into each geometry so that
    // meshes can be placed in world space without a scaled parent group.
    // This makes TransformControls work correctly on individual vertebrae.
    for (const geometry of geometries) {
      geometry.translate(-transform.center.x, -transform.center.y, -transform.center.z);
      geometry.scale(transform.scale, transform.scale, transform.scale);
    }
    return { geometries, transform, anchors, implants };
  }, [geometries]);
}

export function SpineLayoutProvider({ children }: { children: ReactNode }) {
  const layout = useSpineLayoutData();
  return <SpineLayoutContext.Provider value={layout}>{children}</SpineLayoutContext.Provider>;
}

export function useSpineLayout(): SpineLayoutData {
  const layout = useContext(SpineLayoutContext);
  if (!layout) {
    throw new Error('useSpineLayout must be used within SpineLayoutProvider');
  }
  return layout;
}
