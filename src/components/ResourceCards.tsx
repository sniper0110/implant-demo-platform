interface ResourceCardsProps {
  onBrochure: () => void;
  onRequestInfo: () => void;
  onShareDemo: () => void;
}

export function ResourceCards({ onBrochure, onRequestInfo, onShareDemo }: ResourceCardsProps) {
  return (
    <div className="resource-cards">
      <button className="resource-card" onClick={onBrochure}>
        <span className="resource-card-icon" aria-hidden="true">📄</span>
        <span className="resource-card-text">
          <span className="resource-card-title">Product Brochure</span>
          <span className="resource-card-desc">Download literature PDF</span>
        </span>
      </button>
      <button className="resource-card" onClick={onRequestInfo}>
        <span className="resource-card-icon" aria-hidden="true">✉</span>
        <span className="resource-card-text">
          <span className="resource-card-title">Request Information</span>
          <span className="resource-card-desc">Technical specs inquiry</span>
        </span>
      </button>
      <button className="resource-card" onClick={onShareDemo}>
        <span className="resource-card-icon" aria-hidden="true">🔗</span>
        <span className="resource-card-text">
          <span className="resource-card-title">Share Demo</span>
          <span className="resource-card-desc">Copy link to clipboard</span>
        </span>
      </button>
    </div>
  );
}
