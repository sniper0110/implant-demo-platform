import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { CameraState } from '../types';

interface CameraControllerProps {
  target: CameraState;
}

const SNAP_THRESHOLD = 0.001;

export function CameraController({ target }: CameraControllerProps) {
  const { camera } = useThree();
  const currentPos = useRef(new THREE.Vector3(...target.position));
  const currentTarget = useRef(new THREE.Vector3(...target.target));
  const desiredPos = useRef(new THREE.Vector3(...target.position));
  const desiredTarget = useRef(new THREE.Vector3(...target.target));
  const [active, setActive] = useState(false);

  useEffect(() => {
    desiredPos.current.set(...target.position);
    desiredTarget.current.set(...target.target);
    setActive(true);
  }, [target.position, target.target]);

  useFrame((_, delta) => {
    if (!active) return;

    const lerpFactor = 1 - Math.exp(-4 * delta);
    currentPos.current.lerp(desiredPos.current, lerpFactor);
    currentTarget.current.lerp(desiredTarget.current, lerpFactor);
    camera.position.copy(currentPos.current);
    camera.lookAt(currentTarget.current);

    // Stop animating once we're close enough — let OrbitControls take over
    const posDelta = currentPos.current.distanceTo(desiredPos.current);
    const targetDelta = currentTarget.current.distanceTo(desiredTarget.current);
    if (posDelta < SNAP_THRESHOLD && targetDelta < SNAP_THRESHOLD) {
      setActive(false);
    }
  });

  return null;
}
