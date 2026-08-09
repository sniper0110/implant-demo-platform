import { useMemo } from 'react';
import * as THREE from 'three';
import { COLORS } from '../constants';
import { useSpineLayout } from '../SpineLayoutContext';

interface PedicleScrewSystemProps {
  visible: boolean;
}

function ThreadedShaft({ length }: { length: number }) {
  const threads = useMemo(() => {
    const count = Math.floor(length / 0.06);
    return Array.from({ length: count }, (_, i) => i);
  }, [length]);

  return (
    <group rotation={[1.15, 0, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.038, 0.032, length, 10]} />
        <meshStandardMaterial color={COLORS.titaniumDark} roughness={0.32} metalness={0.74} />
      </mesh>
      {threads.map((i) => (
        <mesh key={i} position={[0, -length / 2 + 0.04 + i * 0.06, 0]} rotation={[Math.PI / 2, 0, i * 0.6]}>
          <torusGeometry args={[0.038, 0.006, 6, 10]} />
          <meshStandardMaterial color={COLORS.titaniumDark} roughness={0.38} metalness={0.68} />
        </mesh>
      ))}
      {/* Self-tapping tip */}
      <mesh position={[0, -length / 2 - 0.03, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.034, 0.08, 8]} />
        <meshStandardMaterial color={COLORS.titaniumDark} roughness={0.35} metalness={0.72} />
      </mesh>
    </group>
  );
}

function TulipHead({ y }: { y: number }) {
  return (
    <group position={[0, y, 0]}>
      {/* Polyaxial ball */}
      <mesh position={[0, 0, -0.14]} castShadow>
        <sphereGeometry args={[0.075, 14, 14]} />
        <meshStandardMaterial color={COLORS.titanium} roughness={0.28} metalness={0.78} />
      </mesh>
      {/* Tulip U-housing */}
      <mesh position={[0, 0.1, -0.14]} castShadow>
        <cylinderGeometry args={[0.065, 0.072, 0.14, 10, 1, true]} />
        <meshStandardMaterial color={COLORS.titanium} roughness={0.28} metalness={0.78} side={THREE.DoubleSide} />
      </mesh>
      {[-0.055, 0.055].map((x, i) => (
        <mesh key={i} position={[x, 0.1, -0.14]} castShadow>
          <boxGeometry args={[0.018, 0.14, 0.04]} />
          <meshStandardMaterial color={COLORS.titanium} roughness={0.28} metalness={0.78} />
        </mesh>
      ))}
      {/* Rod channel */}
      <mesh position={[0, 0.1, -0.14]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.038, 0.038, 0.14, 10]} />
        <meshStandardMaterial color="#1a1c22" roughness={0.9} metalness={0.1} />
      </mesh>
      {/* Set screw */}
      <mesh position={[0, 0.2, -0.1]} castShadow>
        <cylinderGeometry args={[0.028, 0.028, 0.05, 6]} />
        <meshStandardMaterial color={COLORS.goldDark} roughness={0.38} metalness={0.58} />
      </mesh>
      <mesh position={[0, 0.23, -0.1]}>
        <cylinderGeometry args={[0.018, 0.018, 0.02, 6]} />
        <meshStandardMaterial color={COLORS.gold} roughness={0.35} metalness={0.62} />
      </mesh>
    </group>
  );
}

function ContouredRod({
  points,
  position,
}: {
  points: THREE.Vector3[];
  position: [number, number, number];
}) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points), [points]);
  return (
    <mesh position={position} castShadow>
      <tubeGeometry args={[curve, 48, 0.034, 10, false]} />
      <meshStandardMaterial
        color={COLORS.titanium}
        roughness={0.22}
        metalness={0.82}
      />
    </mesh>
  );
}

function CrossConnector({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.028, 0.028, 1.35, 10]} />
        <meshStandardMaterial color={COLORS.titanium} roughness={0.28} metalness={0.76} />
      </mesh>
      {[-0.55, 0.55].map((x, i) => (
        <group key={i} position={[x, 0, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.12, 0.08, 0.1]} />
            <meshStandardMaterial color={COLORS.gold} roughness={0.38} metalness={0.58} />
          </mesh>
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.022, 0.022, 0.04, 6]} />
            <meshStandardMaterial color={COLORS.goldDark} roughness={0.4} metalness={0.55} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function PedicleScrew({
  position,
  side,
}: {
  position: [number, number, number];
  side: 'left' | 'right';
}) {
  const angle = side === 'left' ? 0.22 : -0.22;
  const tilt = side === 'left' ? 0.12 : -0.12;

  return (
    <group position={position} rotation={[0, angle, tilt]}>
      <ThreadedShaft length={0.72} />
      <TulipHead y={0.38} />
    </group>
  );
}

export function PedicleScrewSystem({ visible }: PedicleScrewSystemProps) {
  const { implants } = useSpineLayout();

  if (!visible) return null;

  const levels = implants.pedicle.levels;

  const leftRodPoints = useMemo(
    () =>
      levels.map(
        (l, i) =>
          new THREE.Vector3(l.left[0], l.y + 0.38 + i * 0.02, l.z - 0.15)
      ),
    [levels]
  );

  const rightRodPoints = useMemo(
    () =>
      levels.map(
        (l, i) =>
          new THREE.Vector3(l.right[0], l.y + 0.38 - i * 0.015, l.z - 0.15)
      ),
    [levels]
  );

  const crossPos = implants.pedicle.crossConnector;

  return (
    <group>
      {levels.map((level, i) => (
        <group key={i}>
          <PedicleScrew position={level.left} side="left" />
          <PedicleScrew position={level.right} side="right" />
        </group>
      ))}

      <ContouredRod points={leftRodPoints} position={[0, 0, 0]} />
      <ContouredRod points={rightRodPoints} position={[0, 0, 0]} />
      <CrossConnector position={crossPos} />
    </group>
  );
}
