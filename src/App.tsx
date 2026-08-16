import { useState, useCallback } from 'react';
import { getStorySteps, getDefaultStepIndex, getNextStepIndex, getPreviousStepIndex } from './data/story';
import type { ViewToggles } from './types';
import { InfoPanel } from './components/InfoPanel';
import { StoryProgress } from './components/StoryProgress';
import { Disclaimer } from './components/Disclaimer';
import { SpineScene } from './scene/SpineScene';

const LUMBAR_STORY_STEPS = getStorySteps('lumbar-fusion');
const DEFAULT_STEP_INDEX = getDefaultStepIndex('lumbar-fusion');

const DEFAULT_TOGGLES: ViewToggles = {
  anatomyOpacity: 0.85,
  cage: true,
  pedicleScrews: true,
  labels: false,
};

export default function App() {
  const [activeStepIndex, setActiveStepIndex] = useState(DEFAULT_STEP_INDEX);
  const [toggles, setToggles] = useState<ViewToggles>(DEFAULT_TOGGLES);

  const activeStep = LUMBAR_STORY_STEPS[activeStepIndex];

  const handleStepChange = useCallback((index: number) => {
    const step = LUMBAR_STORY_STEPS[index];
    if (!step) return;
    setActiveStepIndex(index);
  }, []);

  const handlePrevious = useCallback(() => {
    handleStepChange(getPreviousStepIndex(activeStepIndex, LUMBAR_STORY_STEPS.length));
  }, [activeStepIndex, handleStepChange]);

  const handleNext = useCallback(() => {
    handleStepChange(getNextStepIndex(activeStepIndex, LUMBAR_STORY_STEPS.length));
  }, [activeStepIndex, handleStepChange]);

  const handleToggle = useCallback((key: keyof Pick<ViewToggles, 'cage' | 'pedicleScrews' | 'labels'>) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleAnatomyOpacityChange = useCallback((value: number) => {
    setToggles((prev) => ({ ...prev, anatomyOpacity: value }));
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true" />
          <div className="brand-text">
            <span className="brand-name">PYCAD</span>
            <span className="brand-tagline">Interactive Implant Demo Portal</span>
          </div>
        </div>
        <div className="header-module">Lumbar Fusion</div>
        <div className="header-meta">
          <span className="header-badge">Sales Module</span>
          <span className="header-version">v1.0.0-mvp</span>
        </div>
      </header>

      <main className="app-main">
        <section className="scene-area" aria-label="3D product visualization">
          <SpineScene
            sceneMode={activeStep.sceneMode}
            productId={activeStep.productId}
            toggles={toggles}
          />

          <StoryProgress
            stepIndex={activeStepIndex}
            totalSteps={LUMBAR_STORY_STEPS.length}
            stepTitle={activeStep.title}
            onPrevious={handlePrevious}
            onNext={handleNext}
          />

          <span className="scene-controls-hint">Drag to orbit · Right-drag to pan · Scroll to zoom</span>
        </section>

        <InfoPanel
          step={activeStep}
          toggles={toggles}
          onToggle={handleToggle}
          onAnatomyOpacityChange={handleAnatomyOpacityChange}
        />
      </main>

      <footer className="app-footer">
        <Disclaimer />
      </footer>
    </div>
  );
}
