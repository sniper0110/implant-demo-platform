import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getStorySteps, getDefaultStepIndex, getNextStepIndex, getPreviousStepIndex } from '../data/story';
import type { ViewToggles } from '../types';
import type { EmbedConfigResponse, EmbedLayout, EmbedRuntimeConfig } from './config';
import { resolveInitialModelPath, resolveModelUrl, toPublicConfig } from './config';
import { canUpgradeModelQuality, detectWebGLSupport, isCoarsePointerDevice, resolveDeviceTier } from './deviceTier';
import { parseParentMessage } from './messages';
import {
  downloadModelBlobUrl,
  readInlinedConfig,
  subscribeModelProgress,
  type DownloadProgress,
} from './modelDownload';
import { createEmbedTelemetry } from './telemetry';
import { LoadingProgress } from './LoadingProgress';
import { InfoPanel } from '../components/InfoPanel';
import { StoryProgress } from '../components/StoryProgress';
import { Disclaimer } from '../components/Disclaimer';
import { preloadSceneModule } from '../scene/preloadScene';

const SpineScene = lazy(() =>
  import('../scene/SpineScene').then((module) => ({ default: module.SpineScene })),
);
function getEmbedIdFromPath(): string {
  const match = window.location.pathname.match(/\/e\/([^/?#]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : 'demo';
}

function getLayoutFromQuery(defaultLayout: EmbedLayout): EmbedLayout {
  const params = new URLSearchParams(window.location.search);
  const layout = params.get('layout');
  return layout === 'full' ? 'full' : layout === 'section' ? 'section' : defaultLayout;
}

function buildRuntimeConfig(data: EmbedConfigResponse, embedId: string): EmbedRuntimeConfig {
  return {
    ...data,
    embedId,
    allowedOrigins: [],
    standaloneUrl: window.location.href,
  };
}

async function fetchEmbedConfig(embedId: string): Promise<EmbedRuntimeConfig> {
  const response = await fetch(`/api/config/${encodeURIComponent(embedId)}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Config unavailable (${response.status})`);
  }
  const data = await response.json();
  return {
    ...data,
    embedId,
    allowedOrigins: data.allowedOrigins ?? [],
    standaloneUrl: data.standaloneUrl ?? window.location.href,
  };
}

function StaticFallback({ message }: { message: string }) {
  return (
    <div className="embed-static-fallback" role="img" aria-label={message}>
      <p>{message}</p>
    </div>
  );
}

function useCompactLayout(): boolean {
  const [compact, setCompact] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false,
  );

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const update = () => setCompact(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return compact;
}

export function EmbedApp() {
  const embedId = getEmbedIdFromPath();
  const [config, setConfig] = useState<EmbedRuntimeConfig | null>(() => {
    const inlined = readInlinedConfig(embedId);
    if (!inlined) return null;
    return buildRuntimeConfig(inlined, embedId);
  });
  const [error, setError] = useState<string | null>(null);
  const [layout, setLayout] = useState<EmbedLayout>(() => {
    const inlined = readInlinedConfig(embedId);
    return getLayoutFromQuery(inlined?.layout ?? 'section');
  });
  const [sceneVisible, setSceneVisible] = useState(true);
  const [sceneError, setSceneError] = useState<string | null>(null);
  const [modelBlobUrl, setModelBlobUrl] = useState<string | null>(null);
  const [modelDownloadError, setModelDownloadError] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [webglSupported] = useState(() => detectWebGLSupport());
  const rootRef = useRef<HTMLDivElement>(null);
  const compactLayout = useCompactLayout();
  const coarseDevice = useMemo(() => isCoarsePointerDevice(), []);
  const deviceTier = useMemo(() => resolveDeviceTier(), []);
  const telemetry = useMemo(() => createEmbedTelemetry(embedId, true), [embedId]);

  useEffect(() => {
    if (config) return;
    let cancelled = false;
    fetchEmbedConfig(embedId)
      .then((loaded) => {
        if (cancelled) return;
        setConfig(loaded);
        setLayout(getLayoutFromQuery(loaded.layout));
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        telemetry.markError('config_failed', err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [config, embedId, telemetry]);

  useEffect(() => {
    if (!config) return;
    telemetry.markReady(layout);
    telemetry.markQualityTier(deviceTier.tier);
  }, [config, layout, telemetry, deviceTier.tier]);

  useEffect(() => {
    if (!config) return;
    const allowedOrigins = config.allowedOrigins.length ? config.allowedOrigins : ['*'];
    const handler = (event: MessageEvent) => {
      const message = parseParentMessage(event, allowedOrigins.filter((o) => o !== '*'));
      if (!message) return;
      if (message.type === 'pycad:parent:visibility') {
        setSceneVisible(message.visible);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [config]);

  const initialModelPath = config ? resolveInitialModelPath(config.models, coarseDevice) : null;
  const initialModelUrl =
    config && initialModelPath
      ? resolveModelUrl(config.assetBaseUrl, config.releaseId, initialModelPath)
      : null;
  const fullModelUrl = config
    ? resolveModelUrl(config.assetBaseUrl, config.releaseId, config.models.initial)
    : null;
  const upgradeModelUrl =
    coarseDevice && fullModelUrl && fullModelUrl !== initialModelUrl ? fullModelUrl : undefined;
  const allowIdleUpgrade = Boolean(upgradeModelUrl && canUpgradeModelQuality());

  useEffect(() => {
    void preloadSceneModule();
  }, []);

  useEffect(() => {
    if (!initialModelUrl) return;

    let revoked: string | null = null;
    let cancelled = false;

    setModelBlobUrl(null);
    setModelDownloadError(null);
    setDownloadProgress(window.__PYCAD_MODEL_PROGRESS__ ?? null);

    const unsubscribe = subscribeModelProgress((progress) => {
      if (!cancelled) setDownloadProgress({ ...progress });
    });

    downloadModelBlobUrl(initialModelUrl, (progress) => {
      if (!cancelled) setDownloadProgress({ ...progress });
    })
      .then((blobUrl) => {
        if (cancelled) {
          URL.revokeObjectURL(blobUrl);
          return;
        }
        revoked = blobUrl;
        setModelBlobUrl(blobUrl);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setModelDownloadError(err.message);
        telemetry.markError('model_download_failed', err.message);
      });

    return () => {
      cancelled = true;
      unsubscribe();
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [initialModelUrl, telemetry]);

  useEffect(() => {
    if (!rootRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setSceneVisible(true);
        }
      },
      { threshold: 0.01, rootMargin: '240px 0px' },
    );
    observer.observe(rootRef.current);
    return () => observer.disconnect();
  }, [config]);

  useEffect(() => {
    const report = () => {
      const root = rootRef.current;
      if (!root) return;
      const height = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
        root.scrollHeight,
        root.getBoundingClientRect().height,
      );
      if (height > 0) telemetry.reportHeight(height);
    };

    report();
    const observer = new ResizeObserver(report);
    if (rootRef.current) observer.observe(rootRef.current);
    window.addEventListener('resize', report);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', report);
    };
  }, [telemetry, config, layout, compactLayout]);

  const storySteps = useMemo(
    () => (config ? getStorySteps(config.productFamily) : []),
    [config],
  );
  const defaultStepIndex = useMemo(
    () => (config ? getDefaultStepIndex(config.productFamily) : 0),
    [config],
  );

  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [toggles, setToggles] = useState<ViewToggles>({
    anatomyOpacity: 0.85,
    cage: true,
    pedicleScrews: true,
    labels: false,
  });

  useEffect(() => {
    if (!config || storySteps.length === 0) return;
    setActiveStepIndex(defaultStepIndex);
    setToggles((prev) => ({
      ...prev,
      cage: config.controls.cage,
      pedicleScrews: config.controls.pedicleScrews,
      labels: config.controls.labels,
    }));
  }, [config, storySteps, defaultStepIndex]);

  const activeStep = storySteps[activeStepIndex];

  const handleStepChange = useCallback(
    (index: number) => {
      const step = storySteps[index];
      if (!step) return;
      setActiveStepIndex(index);
      telemetry.markStep(index, step.title);
    },
    [storySteps, telemetry],
  );

  const handlePrevious = useCallback(() => {
    handleStepChange(getPreviousStepIndex(activeStepIndex, storySteps.length));
  }, [activeStepIndex, handleStepChange, storySteps.length]);

  const handleNext = useCallback(() => {
    handleStepChange(getNextStepIndex(activeStepIndex, storySteps.length));
  }, [activeStepIndex, handleStepChange, storySteps.length]);

  const handleToggle = useCallback((key: keyof Pick<ViewToggles, 'cage' | 'pedicleScrews' | 'labels'>) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleAnatomyOpacityChange = useCallback((value: number) => {
    setToggles((prev) => ({ ...prev, anatomyOpacity: value }));
  }, []);

  if (error) {
    return (
      <div className={`app embed-app layout-${layout}`} ref={rootRef}>
        <div className="embed-error-state">{error}</div>
      </div>
    );
  }

  if (!config || !activeStep) {
    return (
      <div className={`app embed-app layout-${layout}`} ref={rootRef}>
        <LoadingProgress progress={downloadProgress} />
      </div>
    );
  }

  const sceneModelUrl = modelBlobUrl ?? initialModelUrl ?? '';

  return (
    <div className={`app embed-app layout-${layout}`} ref={rootRef} data-embed-id={config.embedId}>
      {config.branding.showHeader && (
        <header className="app-header">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true" />
            <div className="brand-text">
              <span className="brand-name">{config.branding.brandName}</span>
              <span className="brand-tagline">{config.branding.brandTagline}</span>
            </div>
          </div>
          <div className="header-module">{config.branding.moduleLabel}</div>
          <div className="header-meta">
            <span className="header-badge">Embed</span>
            <span className="header-version">{config.releaseId}</span>
          </div>
        </header>
      )}

      <main className="app-main">
        <section className="scene-area" aria-label="3D product visualization">
          {!webglSupported ? (
            <StaticFallback message="WebGL is unavailable in this browser. Open the standalone demo to view the implant visualization." />
          ) : modelDownloadError ? (
            <StaticFallback message={`3D model failed to load. ${modelDownloadError}`} />
          ) : sceneError ? (
            <StaticFallback message={`3D model failed to load. ${sceneError}`} />
          ) : !modelBlobUrl ? (
            <LoadingProgress progress={downloadProgress} />
          ) : sceneVisible ? (
            <Suspense fallback={<LoadingProgress progress={downloadProgress} parsingScene />}>
              <SpineScene
                sceneMode={activeStep.sceneMode}
                productId={activeStep.productId}
                toggles={toggles}
                modelUrl={sceneModelUrl}
                upgradeModelUrl={upgradeModelUrl}
                allowIdleUpgrade={allowIdleUpgrade}
                qualityTier={deviceTier}
                onSceneLoaded={() => telemetry.markLoaded()}
                onFirstFrame={() => telemetry.markFirstFrame()}
                onSceneError={(message) => {
                  setSceneError(message);
                  telemetry.markError('scene_load_failed', message);
                }}
              />
            </Suspense>
          ) : (
            <LoadingProgress progress={downloadProgress} />
          )}

          {config.controls.storyNavigation && (
            <StoryProgress
              stepIndex={activeStepIndex}
              totalSteps={storySteps.length}
              stepTitle={activeStep.title}
              onPrevious={handlePrevious}
              onNext={handleNext}
            />
          )}

          <span className="scene-controls-hint">Drag to orbit · Right-drag to pan · Scroll to zoom</span>
        </section>

        {config.branding.showSidePanel && (
          <InfoPanel
            step={activeStep}
            toggles={toggles}
            onToggle={handleToggle}
            onAnatomyOpacityChange={handleAnatomyOpacityChange}
            compactLayout={compactLayout}
          />
        )}
      </main>

      {config.branding.showFooter && (
        <footer className="app-footer">
          <Disclaimer />
        </footer>
      )}
    </div>
  );
}

export { toPublicConfig };
