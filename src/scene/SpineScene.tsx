import { Component, Suspense, type ErrorInfo, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type {
  ProductId,
  SceneMode,
  ViewToggles,
  CameraState,
  MeasurementAnnotation,
} from '../types';
import { SceneLighting } from './SpineAnatomy';
import { SceneMeasurements } from './SceneMeasurements';
import { SceneLoadingFallback } from './SceneLoadingFallback';
import { GlbLumbarScene } from './GlbLumbarScene';
import { GlbSceneLabels } from './GlbSceneLabels';
import { GlbCameraFit } from './GlbCameraFit';
import { useGlbSceneLayout } from './GlbSceneLayoutContext';

interface SpineSceneProps {
  sceneMode: SceneMode;
  productId: ProductId;
  toggles: ViewToggles;
  camera: CameraState;
  measurements: MeasurementAnnotation[];
}

function LumbarGlbOverlays({ sceneMode, toggles, measurements }: SpineSceneProps) {
  const layout = useGlbSceneLayout();

  return (
    <>
      <GlbCameraFit root={layout.root} sceneMode={sceneMode} focusMeshes={layout.focusMeshes} />
      <GlbSceneLabels sceneMode={sceneMode} visible={toggles.labels} />
      <SceneMeasurements measurements={measurements} visible={toggles.measurements} />
    </>
  );
}

function LumbarSceneContent(props: SpineSceneProps) {
  return (
    <>
      <SceneLighting />
      <OrbitControls makeDefault enablePan enableZoom enableRotate maxPolarAngle={Math.PI} minPolarAngle={0} />

      <GlbLumbarScene toggles={props.toggles}>
        <LumbarGlbOverlays {...props} />
      </GlbLumbarScene>
    </>
  );
}

interface SceneErrorBoundaryProps {
  children: ReactNode;
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
    console.warn('Scene loading failed.', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <>
          <SceneLighting />
          <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#323848" wireframe />
          </mesh>
        </>
      );
    }
    return this.props.children;
  }
}

export function SpineScene(props: SpineSceneProps) {
  return (
    <Canvas
      className="scene-canvas"
      shadows
      camera={{ position: [0, 50, 100], fov: 42, near: 0.1, far: 2000 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#0a0b0d' }}
    >
      <color attach="background" args={['#0a0b0d']} />
      <fog attach="fog" args={['#0a0b0d', 200, 800]} />
      <SceneErrorBoundary>
        <Suspense fallback={<SceneLoadingFallback message="Loading lumbar fusion scene…" />}>
          <LumbarSceneContent {...props} />
        </Suspense>
      </SceneErrorBoundary>
    </Canvas>
  );
}
