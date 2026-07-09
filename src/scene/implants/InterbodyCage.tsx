import { useMemo } from 'react';
import * as THREE from 'three';
import { COLORS, EXPLODE_OFFSETS } from '../constants';
import { useSpineLayout } from '../SpineLayoutContext';

interface InterbodyCageProps {
  variant: 'solid' | 'lattice';
  visible: boolean;
  explode: boolean;
}

function ThreadedTeeth({ width, depth }: { width: number; depth: number }) {
  const teeth = useMemo(() => {
    const items: [number, number, number][] = [];
    for (let x = -2; x <= 2; x += 1) {
      for (let z = -2; z <= 2; z += 1) {
        items.push([x * width * 0.18, 0, z * depth * 0.2]);
      }
    }
    return items;
  }, [width, depth]);

  return (
    <>
      {teeth.map((pos, i) => (
        <mesh key={i} position={pos} rotation={[0.15, 0, 0]}>
          <boxGeometry args={[width * 0.1, 0.05, depth * 0.12]} />
          <meshStandardMaterial color={COLORS.titaniumDark} roughness={0.35} metalness={0.65} />
        </mesh>
      ))}
    </>
  );
}

function LatticeCore() {
  const struts = useMemo(() => {
    const items: { pos: [number, number, number]; rot: [number, number, number]; len: number }[] = [];
    for (let layer = -2; layer <= 2; layer += 1) {
      for (let row = -2; row <= 2; row += 1) {
        if ((layer + row) % 2 === 0) {
          items.push({ pos: [row * 0.13, layer * 0.11, 0], rot: [0, 0, Math.PI / 2], len: 0.22 });
          items.push({ pos: [0, layer * 0.11, row * 0.1], rot: [Math.PI / 2, 0, 0], len: 0.18 });
        }
      }
    }
    return items;
  }, []);

  return (
    <group>
      {struts.map((s, i) => (
        <mesh key={i} position={s.pos} rotation={s.rot}>
          <cylinderGeometry args={[0.012, 0.012, s.len, 6]} />
          <meshStandardMaterial color={COLORS.lattice} roughness={0.45} metalness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

function CageShell({ variant }: { variant: 'solid' | 'lattice' }) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    const w = 0.36;
    const h = 0.52;
    s.moveTo(-w, -h * 0.35);
    s.lineTo(w, -h * 0.55);
    s.lineTo(w, h * 0.45);
    s.lineTo(-w, h * 0.55);
    s.closePath();
    return s;
  }, []);

  const extrudeSettings = useMemo(
    () => ({
      depth: 0.58,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.02,
      bevelSegments: 2,
      curveSegments: 12,
    }),
    []
  );

  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh castShadow>
        <extrudeGeometry args={[shape, extrudeSettings]} />
        <meshStandardMaterial
          color={COLORS.titanium}
          roughness={0.32}
          metalness={0.72}
          transparent={variant === 'lattice'}
          opacity={variant === 'lattice' ? 0.18 : 1}
        />
      </mesh>
      {/* Central graft window */}
      <mesh position={[0, 0, 0.29]}>
        <boxGeometry args={[0.38, 0.42, 0.32]} />
        <meshStandardMaterial color="#0a0b0d" roughness={1} />
      </mesh>
      {/* Lordotic taper rails */}
      <mesh position={[-0.34, 0, 0.29]} rotation={[0, 0, -0.12]}>
        <boxGeometry args={[0.04, 0.5, 0.28]} />
        <meshStandardMaterial color={COLORS.gold} roughness={0.38} metalness={0.58} />
      </mesh>
      <mesh position={[0.34, 0, 0.29]} rotation={[0, 0, 0.12]}>
        <boxGeometry args={[0.04, 0.5, 0.28]} />
        <meshStandardMaterial color={COLORS.gold} roughness={0.38} metalness={0.58} />
      </mesh>
    </group>
  );
}

export function InterbodyCage({ variant, visible, explode }: InterbodyCageProps) {
  const { implants } = useSpineLayout();

  if (!visible) return null;

  const offset = explode ? EXPLODE_OFFSETS.cage : ([0, 0, 0] as [number, number, number]);
  const base = implants.interbody.position;

  return (
    <group
      position={[base[0] + offset[0], base[1] + offset[1], base[2] + offset[2]]}
      rotation={[-0.35, 0, 0]}
    >
      <CageShell variant={variant} />
      <group position={[0, 0.28, 0]}>
        <ThreadedTeeth width={0.75} depth={0.65} />
      </group>
      <group position={[0, -0.28, 0]} rotation={[Math.PI, 0, 0]}>
        <ThreadedTeeth width={0.75} depth={0.65} />
      </group>
      {variant === 'lattice' && <LatticeCore />}
    </group>
  );
}
