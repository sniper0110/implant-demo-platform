import { useMemo } from 'react';
import * as THREE from 'three';
import { COLORS, EXPLODE_OFFSETS } from '../constants';
import { useSpineLayout } from '../SpineLayoutContext';

interface CervicalPlateProps {
  visible: boolean;
  explode: boolean;
}

function CountersunkScrew({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[0.55, 0, 0]}>
      {/* Countersunk taper */}
      <mesh position={[0, 0.12, 0.04]} castShadow>
        <cylinderGeometry args={[0.055, 0.028, 0.1, 8]} />
        <meshStandardMaterial color={COLORS.titanium} roughness={0.28} metalness={0.78} />
      </mesh>
      {/* Screw shaft */}
      <mesh position={[0, -0.06, 0.02]} castShadow>
        <cylinderGeometry args={[0.028, 0.024, 0.32, 8]} />
        <meshStandardMaterial color={COLORS.titaniumDark} roughness={0.35} metalness={0.72} />
      </mesh>
      {/* Hex set recess */}
      <mesh position={[0, 0.17, 0.06]} rotation={[0.55, 0, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.03, 6]} />
        <meshStandardMaterial color={COLORS.goldDark} roughness={0.42} metalness={0.55} />
      </mesh>
    </group>
  );
}

export function CervicalPlate({ visible, explode }: CervicalPlateProps) {
  const { implants } = useSpineLayout();

  const plateShape = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.12, -0.42);
    shape.quadraticCurveTo(-0.32, -0.48, -0.28, -0.2);
    shape.quadraticCurveTo(-0.3, 0.15, -0.22, 0.42);
    shape.quadraticCurveTo(0, 0.52, 0.22, 0.42);
    shape.quadraticCurveTo(0.3, 0.15, 0.28, -0.2);
    shape.quadraticCurveTo(0.32, -0.48, 0.12, -0.42);
    shape.quadraticCurveTo(0, -0.38, -0.12, -0.42);
    return shape;
  }, []);

  if (!visible) return null;

  const offset = explode ? EXPLODE_OFFSETS.plate : ([0, 0, 0] as [number, number, number]);
  const center = implants.cervical.plateCenter;

  return (
    <group
      position={[
        center[0] + offset[0],
        center[1] + offset[1],
        center[2] + offset[2],
      ]}
      rotation={[-0.25, 0, 0]}
    >
      {/* Contoured plate body */}
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
        <extrudeGeometry
          args={[
            plateShape,
            { depth: 0.055, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 3, curveSegments: 16 },
          ]}
        />
        <meshStandardMaterial
          color={COLORS.titanium}
          roughness={0.28}
          metalness={0.78}
        />
      </mesh>

      {/* Gold accent rim */}
      <mesh position={[0, 0.03, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
        <extrudeGeometry
          args={[
            plateShape,
            { depth: 0.012, bevelEnabled: false, curveSegments: 16 },
          ]}
        />
        <meshStandardMaterial color={COLORS.gold} roughness={0.38} metalness={0.58} />
      </mesh>

      {/* Locking tabs */}
      {[-0.24, 0.24].map((x, i) => (
        <mesh key={i} position={[x, 0.38, 0.04]} rotation={[0.3, 0, 0]} castShadow>
          <boxGeometry args={[0.08, 0.04, 0.06]} />
          <meshStandardMaterial color={COLORS.goldDark} roughness={0.4} metalness={0.6} />
        </mesh>
      ))}

      {implants.cervical.screwPositions.map((pos, i) => (
        <CountersunkScrew
          key={i}
          position={[
            pos[0] - center[0],
            pos[1] - center[1],
            pos[2] - center[2],
          ]}
        />
      ))}
    </group>
  );
}
