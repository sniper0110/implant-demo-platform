import { useState, useCallback } from 'react';
import { STORY_STEPS } from './data/story';
import { PRODUCT_MAP } from './data/products';
import type { ProductId, ViewToggles, CameraState } from './types';
import { StoryPanel } from './components/StoryPanel';
import { ProductSelector } from './components/ProductSelector';
import { ViewControls } from './components/ViewControls';
import { ResourceCards } from './components/ResourceCards';
import { Disclaimer } from './components/Disclaimer';
import { SpineScene } from './scene/SpineScene';

const DEFAULT_TOGGLES: ViewToggles = {
  anatomy: true,
  implant: true,
  labels: true,
  explode: false,
};

export default function App() {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [productId, setProductId] = useState<ProductId>('solar-psi');
  const [toggles, setToggles] = useState<ViewToggles>(DEFAULT_TOGGLES);
  const [camera, setCamera] = useState<CameraState>(STORY_STEPS[0].camera);

  const product = PRODUCT_MAP[productId];

  const handleStepSelect = useCallback((index: number) => {
    const step = STORY_STEPS[index];
    setActiveStepIndex(index);
    setProductId(step.productId);
    setCamera(step.camera);
  }, []);

  const handleProductSelect = useCallback((id: ProductId) => {
    setProductId(id);
  }, []);

  const handleToggle = useCallback((key: keyof ViewToggles) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleBrochure = useCallback(() => {
    alert(
      `Brochure request registered for ${product.name}.\n\nIn production, this would trigger a PDF download or CRM lead capture.`
    );
  }, [product.name]);

  const handleRequestInfo = useCallback(() => {
    alert(
      `Information request submitted for ${product.name}.\n\nIn production, this would open a contact form or integrate with your sales pipeline.`
    );
  }, [product.name]);

  const handleShareDemo = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      alert(`Demo link copied to clipboard:\n${url}`);
    }).catch(() => {
      alert(`Share this demo:\n${url}`);
    });
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true" />
          <div className="brand-text">
            <span className="brand-name">DeGen</span>
            <span className="brand-tagline">Interactive Implant Demo Portal</span>
          </div>
        </div>
        <div className="header-meta">
          <span className="header-badge">Sales Module</span>
          <span className="header-version">v1.0.0-mvp</span>
        </div>
      </header>

      <main className="app-main">
        <aside className="left-panel">
          <StoryPanel
            activeStepIndex={activeStepIndex}
            onStepSelect={handleStepSelect}
          />

          <div className="panel-section">
            <div className="panel-section-title">Product Selector</div>
            <ProductSelector
              activeProductId={productId}
              onSelect={handleProductSelect}
            />
          </div>

          <div className="panel-section">
            <div className="panel-section-title">View Controls</div>
            <ViewControls toggles={toggles} onToggle={handleToggle} />
          </div>
        </aside>

        <section className="scene-area" aria-label="3D product visualization">
          <SpineScene productId={productId} toggles={toggles} camera={camera} />

          <div className="scene-overlay-top">
            <div className="scene-product-chip">
              <span className="scene-product-name">{product.name}</span>
              <span className="scene-product-category">{product.category}</span>
            </div>
            <span className="scene-region-badge">{product.region} region</span>
          </div>

          <div className="scene-overlay-bottom">
            <div className="scene-highlights">
              {product.highlights.map((h) => (
                <span key={h} className="highlight-chip">{h}</span>
              ))}
            </div>
            <span className="scene-controls-hint">Drag to orbit · Right-drag to pan · Scroll to zoom</span>
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <ResourceCards
          onBrochure={handleBrochure}
          onRequestInfo={handleRequestInfo}
          onShareDemo={handleShareDemo}
        />
        <Disclaimer />
      </footer>
    </div>
  );
}
