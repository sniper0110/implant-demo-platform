import { Component, Suspense, useEffect, type ErrorInfo, type ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { ProductId, SceneMode, ViewToggles } from '../types';
import type { DeviceTierResult } from '../embed/deviceTier';
import { SceneLighting } from './SpineAnatomy';
import { SceneLoadingFallback } from './SceneLoadingFallback';
import { GlbLumbarScene } from './GlbLumbarScene';
import { GlbSceneLabels } from './GlbSceneLabels';
import { GlbCameraFit } from './GlbCameraFit';
import { useGlbSceneLayout } from './GlbSceneLayoutContext';
import { LUMBAR_FUSION_GLB_URL } from './sceneAssetConfig';

/** Medium neutral slate — improves implant contrast vs near-black UI chrome. */
const SCENE_BACKGROUND = '#343A40';

interface SpineSceneProps {
  sceneMode: SceneMode;
  productId: ProductId;
  toggles: ViewToggles;
  modelUrl?: string;
  detailModelUrl?: string;
  upgradeModelUrl?: string;
  allowIdleUpgrade?: boolean;
  qualityTier?: DeviceTierResult;
  onSceneLoaded?: () => void;
  onFirstFrame?: () => void;
  onSceneError?: (message: string) => void;
}

function LumbarGlbOverlays({ sceneMode, toggles }: Pick<SpineSceneProps, 'sceneMode' | 'toggles'>) {
  const layout = useGlbSceneLayout();
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    invalidate();
  }, [sceneMode, toggles.labels, invalidate]);

  return (
    <>
      <GlbCameraFit
        root={layout.root}
        sceneMode={sceneMode}
        focusMeshes={layout.focusMeshes}
        anatomyOpacity={toggles.anatomyOpacity}
        showCage={toggles.cage}
        showPedicleScrews={toggles.pedicleScrews}
      />
      <GlbSceneLabels sceneMode={sceneMode} visible={toggles.labels} />
    </>
  );
}

function LumbarSceneContent(props: SpineSceneProps) {
  const quality = props.qualityTier;

  return (
    <>
      <SceneLighting shadows={quality?.shadows ?? true} />
      <OrbitControls makeDefault enablePan enableZoom enableRotate maxPolarAngle={Math.PI} minPolarAngle={0} />

      <GlbLumbarScene
        sceneMode={props.sceneMode}
        toggles={props.toggles}
        modelUrl={props.modelUrl ?? LUMBAR_FUSION_GLB_URL}
        detailModelUrl={props.detailModelUrl}
        upgradeModelUrl={props.upgradeModelUrl}
        allowDetailUpgrade={quality?.allowDetailModel ?? false}
        allowIdleUpgrade={props.allowIdleUpgrade ?? false}
        onSceneLoaded={props.onSceneLoaded}
        onFirstFrame={props.onFirstFrame}
      >
        <LumbarGlbOverlays sceneMode={props.sceneMode} toggles={props.toggles} />
      </GlbLumbarScene>
    </>
  );
}

interface SceneErrorBoundaryProps {
  children: ReactNode;
  onError?: (message: string) => void;
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
    this.props.onError?.(error.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <>
          <SceneLighting shadows={false} />
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

function WheelCapture() {
  const { gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [gl]);

  return null;
}

function CanvasResizeInvalidator() {
  const { gl, invalidate, size } = useThree();

  useEffect(() => {
    invalidate();
  }, [size.width, size.height, invalidate]);

  useEffect(() => {
    const canvas = gl.domElement;
    const observer = new ResizeObserver(() => invalidate());
    observer.observe(canvas.parentElement ?? canvas);
    return () => observer.disconnect();
  }, [gl, invalidate]);

  return null;
}

export function SpineScene({ qualityTier, modelUrl, onSceneError, ...props }: SpineSceneProps) {
  const dpr = qualityTier?.dprCap ?? Math.min(window.devicePixelRatio, 2);
  const frameloop = qualityTier?.frameloop ?? 'demand';

  return (
    <Canvas
      className="scene-canvas"
      shadows={qualityTier?.shadows ?? true}
      camera={{ position: [0, 50, 100], fov: 42, near: 0.1, far: 2000 }}
      gl={{ antialias: qualityTier?.antialias ?? true, alpha: false, powerPreference: 'high-performance' }}
      style={{ background: SCENE_BACKGROUND, touchAction: 'none' }}
      dpr={dpr}
      frameloop={frameloop}
      onCreated={({ invalidate }) => {
        invalidate();
      }}
    >
      <color attach="background" args={[SCENE_BACKGROUND]} />
      <fog attach="fog" args={[SCENE_BACKGROUND, 200, 800]} />
      <WheelCapture />
      <CanvasResizeInvalidator />
      <SceneErrorBoundary onError={onSceneError}>
        <Suspense fallback={<SceneLoadingFallback message="Loading lumbar fusion scene…" />}>
          <LumbarSceneContent {...props} modelUrl={modelUrl} qualityTier={qualityTier} />
        </Suspense>
      </SceneErrorBoundary>
    </Canvas>
  );
}
