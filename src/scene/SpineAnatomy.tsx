import { useMemo } from 'react';
import { COLORS } from './constants';
import { useSpineLayout } from './SpineLayoutContext';
import { getBoneColor } from './spineLayout';

interface SpineAnatomyProps {
  opacity: number;
}

function Disc({
  position,
  radius,
  opacity,
}: {
  position: [number, number, number];
  radius: number;
  opacity: number;
}) {
  if (opacity <= 0) return null;

  return (
    <mesh position={position}>
      <cylinderGeometry args={[radius, radius, 0.08, 20]} />
      <meshStandardMaterial
        color={COLORS.disc}
        roughness={0.9}
        metalness={0}
        transparent
        opacity={Math.min(0.85, opacity * 0.85)}
      />
    </mesh>
  );
}

const VERTEBRA_KEYS = ['T11', 'T12', 'L1', 'L2', 'L3', 'L4', 'L5', 'S1', 'Sacrum'];

/** Simplified procedural spine shown while CT meshes load or if loading fails. */
export function ProceduralSpineFallback({ opacity }: { opacity: number }) {
  if (opacity <= 0) return null;

  const blocks = useMemo(
    () =>
      [-1.8, -1.0, -0.2, 0.6, 1.4, 2.0, 2.4, 2.7, 2.9].map((y, i) => ({
        y,
        w: 1.0 + (i % 3) * 0.05,
        h: 0.55 - i * 0.02,
      })),
    []
  );

  return (
    <group>
      {blocks.map((b, i) => (
        <mesh key={i} position={[0, b.y, 0]} castShadow>
          <boxGeometry args={[b.w, b.h, b.w * 0.75]} />
          <meshStandardMaterial
            color={getBoneColor(i)}
            roughness={0.8}
            transparent
            opacity={Math.min(0.55, opacity * 0.55)}
          />
        </mesh>
      ))}
    </group>
  );
}

export function SpineAnatomy({ opacity }: SpineAnatomyProps) {
  const { geometries, anchors } = useSpineLayout();

  const discs = useMemo(() => {
    const items: { position: [number, number, number]; radius: number }[] = [];
    for (let i = 0; i < anchors.length - 1; i += 1) {
      const a = anchors[i];
      const b = anchors[i + 1];
      items.push({
        position: [
          (a.center[0] + b.center[0]) / 2,
          (a.center[1] + b.center[1]) / 2,
          (a.center[2] + b.center[2]) / 2,
        ],
        radius: 0.38 - i * 0.01,
      });
    }
    return items;
  }, [anchors]);

  if (opacity <= 0) return null;

  return (
    <>
      {geometries.map((geometry, index) => (
        <mesh key={VERTEBRA_KEYS[index]} geometry={geometry} castShadow receiveShadow>
          <meshStandardMaterial
            color={getBoneColor(index)}
            roughness={0.72 + (index % 3) * 0.04}
            metalness={0.04 + (index % 2) * 0.02}
            transparent
            opacity={opacity}
          />
        </mesh>
      ))}
      {discs.map((disc, i) => (
        <Disc key={`disc-${i}`} position={disc.position} radius={disc.radius} opacity={opacity} />
      ))}
    </>
  );
}

export function SceneLighting({ shadows = true }: { shadows?: boolean }) {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={1.2}
        castShadow={shadows}
        shadow-mapSize={shadows ? [1024, 1024] : undefined}
      />
      <directionalLight position={[-4, 4, -3]} intensity={0.4} color="#8899bb" />
      <directionalLight position={[-6, -4, 7]} intensity={1.8} color="#ffffff" />
      <directionalLight position={[5, -7, 9]} intensity={1.35} color="#fff0cf" />
      <pointLight position={[0, 3, 2]} intensity={0.3} color={COLORS.gold} />
    </>
  );
}
