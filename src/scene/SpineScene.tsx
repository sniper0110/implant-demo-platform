import { Component, Suspense, type ErrorInfo, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { ProductId, ViewToggles, CameraState } from '../types';
import { getRegionForProduct } from './constants';
import { CameraController } from './CameraController';
import { SpineAnatomy, GroundGrid, SceneLighting, ProceduralSpineFallback } from './SpineAnatomy';
import { SpineLayoutProvider } from './SpineLayoutContext';
import { InterbodyCage } from './implants/InterbodyCage';
import { CervicalPlate } from './implants/CervicalPlate';
import { PedicleScrewSystem } from './implants/PedicleScrewSystem';
import { VADDevice } from './implants/VADDevice';
import { SceneLabels } from './SceneLabels';
import { SceneLoadingFallback } from './SceneLoadingFallback';

interface SpineSceneProps {
  productId: ProductId;
  toggles: ViewToggles;
  camera: CameraState;
}

function ImplantRenderer({
  productId,
  visible,
  explode,
}: {
  productId: ProductId;
  visible: boolean;
  explode: boolean;
}) {
  switch (productId) {
    case 'solar-psi':
      return <InterbodyCage variant="solid" visible={visible} explode={explode} />;
    case 'impulse-am':
      return <InterbodyCage variant="lattice" visible={visible} explode={explode} />;
    case 'hyper-c':
      return <CervicalPlate visible={visible} explode={explode} />;
    case 'e3-f1':
      return <PedicleScrewSystem visible={visible} explode={explode} />;
    case 'augmenta-vad':
      return <VADDevice visible={visible} explode={explode} />;
    default:
      return null;
  }
}

function SceneContent({ productId, toggles, camera }: SpineSceneProps) {
  const region = getRegionForProduct(productId);

  return (
    <SpineLayoutProvider>
      <SceneLighting />
      <CameraController target={camera} />
      <OrbitControls
        makeDefault
        enablePan
        enableZoom
        enableRotate
        minDistance={2}
        maxDistance={40}
        maxPolarAngle={Math.PI}
        minPolarAngle={0}
        target={camera.target}
      />

      <SpineAnatomy region={region} visible={toggles.anatomy} explode={toggles.explode} />
      <ImplantRenderer productId={productId} visible={toggles.implant} explode={toggles.explode} />
      <SceneLabels productId={productId} visible={toggles.labels} />
      <GroundGrid />
    </SpineLayoutProvider>
  );
}

interface SceneErrorBoundaryProps {
  children: ReactNode;
  anatomyVisible: boolean;
}

interface SceneErrorBoundaryState {
  hasError: boolean;
}

class SceneErrorBoundary extends Component<SceneErrorBoundaryProps, SceneErrorBoundaryState> {
  state: SceneErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): SceneErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('Spine mesh loading failed, using procedural fallback.', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <>
          <SceneLighting />
          <ProceduralSpineFallback visible={this.props.anatomyVisible} />
          <GroundGrid />
        </>
      );
    }
    return this.props.children;
  }
}

export function SpineScene({ productId, toggles, camera }: SpineSceneProps) {
  return (
    <Canvas
      className="scene-canvas"
      shadows
      camera={{ position: camera.position, fov: 42, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#0a0b0d' }}
    >
      <color attach="background" args={['#0a0b0d']} />
      <fog attach="fog" args={['#0a0b0d', 40, 80]} />
      <SceneErrorBoundary anatomyVisible={toggles.anatomy}>
        <Suspense fallback={<SceneLoadingFallback />}>
          <SceneContent productId={productId} toggles={toggles} camera={camera} />
        </Suspense>
      </SceneErrorBoundary>
    </Canvas>
  );
}
