import { Box3, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { COLORS } from './constants';

export const SPINE_MESH_URLS = [
  '/spine-meshes/T11.stl',
  '/spine-meshes/T12.stl',
  '/spine-meshes/L1.stl',
  '/spine-meshes/L2.stl',
  '/spine-meshes/L3.stl',
  '/spine-meshes/L4.stl',
  '/spine-meshes/L5.stl',
  '/spine-meshes/S1.stl',
  '/spine-meshes/sacrum.stl',
] as const;

export const VERTEBRA_LEVELS = [
  { id: 'T11', label: 'T11' },
  { id: 'T12', label: 'T12' },
  { id: 'L1', label: 'L1' },
  { id: 'L2', label: 'L2' },
  { id: 'L3', label: 'L3' },
  { id: 'L4', label: 'L4' },
  { id: 'L5', label: 'L5' },
  { id: 'S1', label: 'S1' },
  { id: 'Sacrum', label: 'Sacrum' },
] as const;

/** Target superior-inferior span to match existing camera framing. */
export const SPINE_TARGET_HEIGHT = 4.5;

const BONE_VARIATIONS = [
  COLORS.bone,
  '#c5b596',
  '#c3b394',
  '#c9ba9c',
  '#c0ad90',
  '#c7b89a',
  '#c4b492',
  '#c6b698',
  COLORS.boneDark,
] as const;

export interface SpineTransform {
  center: Vector3;
  scale: number;
}

export interface VertebraAnchor {
  id: string;
  label: string;
  center: [number, number, number];
  /** Anterior-facing point for plates / cages. */
  anterior: [number, number, number];
  /** Posterior point for pedicle screws / rods. */
  posterior: [number, number, number];
}

export function computeSpineTransform(geometries: BufferGeometry[]): SpineTransform {
  const box = new Box3();
  for (const geometry of geometries) {
    geometry.computeBoundingBox();
    if (geometry.boundingBox) {
      box.union(geometry.boundingBox);
    }
  }
  const size = new Vector3();
  const center = new Vector3();
  box.getSize(size);
  box.getCenter(center);
  return { center, scale: SPINE_TARGET_HEIGHT / size.y };
}

export function getBoneColor(index: number): string {
  return BONE_VARIATIONS[index % BONE_VARIATIONS.length];
}

export function buildVertebraAnchors(geometries: BufferGeometry[], transform: SpineTransform): VertebraAnchor[] {
  const { center, scale } = transform;

  return geometries.map((geometry, index) => {
    geometry.computeBoundingBox();
    const bb = geometry.boundingBox!;
    const c = new Vector3();
    bb.getCenter(c);

    const norm = (v: Vector3): [number, number, number] => [
      (v.x - center.x) * scale,
      (v.y - center.y) * scale,
      (v.z - center.z) * scale,
    ];

    const centerNorm = norm(c);
    const anterior = norm(new Vector3(c.x, c.y, bb.max.z));
    const posterior = norm(new Vector3(c.x, c.y, bb.min.z));

    const level = VERTEBRA_LEVELS[index];
    return {
      id: level.id,
      label: level.label,
      center: centerNorm,
      anterior,
      posterior,
    };
  });
}

export function midpoint(
  a: [number, number, number],
  b: [number, number, number]
): [number, number, number] {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
}

/** Implant anchor points derived from normalized CT mesh layout. */
export function buildImplantAnchors(anchors: VertebraAnchor[]) {
  const byId = Object.fromEntries(anchors.map((a) => [a.id, a])) as Record<string, VertebraAnchor>;

  const l2 = byId.L2;
  const l3 = byId.L3;
  const l4 = byId.L4;
  const l5 = byId.L5;
  const t11 = byId.T11;
  const t12 = byId.T12;

  const discL3L4 = midpoint(l3.anterior, l4.anterior);
  const discL4L5 = midpoint(l4.anterior, l5.anterior);

  return {
    interbody: {
      position: [(discL3L4[0] + discL4L5[0]) / 2, (discL3L4[1] + discL4L5[1]) / 2, (discL3L4[2] + discL4L5[2]) / 2] as [
        number,
        number,
        number,
      ],
      endplateTop: l3.anterior,
      endplateBottom: l4.anterior,
    },
    pedicle: {
      levels: [l2, l3, l4].map((v) => ({
        left: [-0.75, v.posterior[1], v.posterior[2] - 0.15] as [number, number, number],
        right: [0.75, v.posterior[1], v.posterior[2] - 0.15] as [number, number, number],
        y: v.posterior[1],
        z: v.posterior[2],
      })),
      rodLeft: [-0.75, (l2.posterior[1] + l4.posterior[1]) / 2 + 0.35, (l2.posterior[2] + l4.posterior[2]) / 2 - 0.15] as [
        number,
        number,
        number,
      ],
      rodRight: [0.75, (l2.posterior[1] + l4.posterior[1]) / 2 + 0.35, (l2.posterior[2] + l4.posterior[2]) / 2 - 0.15] as [
        number,
        number,
        number,
      ],
      crossConnector: [0, l3.posterior[1], l3.posterior[2] - 0.15] as [number, number, number],
    },
    cervical: {
      plateCenter: midpoint(t11.anterior, t12.anterior),
      screwPositions: [
        [-0.2, t12.anterior[1] - 0.05, t12.anterior[2] + 0.08],
        [0.2, t12.anterior[1] - 0.05, t12.anterior[2] + 0.08],
        [-0.2, t11.anterior[1] + 0.15, t11.anterior[2] + 0.08],
        [0.2, t11.anterior[1] + 0.15, t11.anterior[2] + 0.08],
      ] as [number, number, number][],
      vertebraLabel: t11.center,
    },
    vad: {
      target: l3.center,
      cannulaBase: l3.anterior,
    },
    labels: {
      vertebralBody: l4.anterior,
      discSpace: discL4L5,
      endplate: l3.anterior,
    },
  };
}
