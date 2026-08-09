import { useMemo } from 'react';
import { COLORS } from '../constants';
import { useSpineLayout } from '../SpineLayoutContext';

interface VADDeviceProps {
  visible: boolean;
}

export function VADDevice({ visible }: VADDeviceProps) {
  const { implants } = useSpineLayout();

  const fillParticles = useMemo(() => {
    const items: { pos: [number, number, number]; size: number }[] = [];
    const target = implants.vad.target;
    for (let i = 0; i < 24; i += 1) {
      const angle = (i / 24) * Math.PI * 2;
      const r = 0.08 + (i % 5) * 0.025;
      items.push({
        pos: [
          target[0] + Math.cos(angle) * r * 0.5,
          target[1] + 0.05 + (i % 4) * 0.06,
          target[2] + Math.sin(angle) * r * 0.3,
        ],
        size: 0.035 + (i % 3) * 0.012,
      });
    }
    return items;
  }, [implants.vad.target]);

  if (!visible) return null;

  const target = implants.vad.target;
  const cannulaBase = implants.vad.cannulaBase;

  return (
    <group>
      {/* Target vertebra region highlight */}
      <mesh position={target}>
        <boxGeometry args={[0.85, 0.48, 0.65]} />
        <meshStandardMaterial
          color={COLORS.bone}
          transparent
          opacity={0.12}
          wireframe
        />
      </mesh>

      {/* Access cannula - left */}
      <group
        position={[cannulaBase[0] - 0.35, cannulaBase[1] + 0.25, cannulaBase[2] + 0.35]}
        rotation={[0.55, -0.3, 0]}
      >
        <mesh castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.9, 10]} />
          <meshStandardMaterial color={COLORS.titanium} roughness={0.3} metalness={0.7} />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.08, 10]} />
          <meshStandardMaterial color={COLORS.gold} roughness={0.4} metalness={0.5} />
        </mesh>
      </group>

      {/* Access cannula - right */}
      <group
        position={[cannulaBase[0] + 0.35, cannulaBase[1] + 0.25, cannulaBase[2] + 0.35]}
        rotation={[0.55, 0.3, 0]}
      >
        <mesh castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.9, 10]} />
          <meshStandardMaterial color={COLORS.titanium} roughness={0.3} metalness={0.7} />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.08, 10]} />
          <meshStandardMaterial color={COLORS.gold} roughness={0.4} metalness={0.5} />
        </mesh>
      </group>

      {/* Fill material distribution */}
      {fillParticles.map((p, i) => (
        <mesh key={i} position={p.pos}>
          <sphereGeometry args={[p.size, 6, 6]} />
          <meshStandardMaterial color={COLORS.cement} roughness={0.9} metalness={0} />
        </mesh>
      ))}

      {/* Delivery handle */}
      <mesh
        position={[cannulaBase[0], cannulaBase[1] + 1.05, cannulaBase[2] + 0.5]}
        rotation={[0.3, 0, 0]}
        castShadow
      >
        <cylinderGeometry args={[0.025, 0.025, 0.5, 8]} />
        <meshStandardMaterial color={COLORS.accent} roughness={0.5} metalness={0.3} />
      </mesh>
    </group>
  );
}
