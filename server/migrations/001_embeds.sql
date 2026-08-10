CREATE TABLE IF NOT EXISTS embed_configs (
  embed_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'active',
  customer_name TEXT NOT NULL,
  allowed_origins TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  default_layout TEXT NOT NULL DEFAULT 'section',
  release_id TEXT NOT NULL DEFAULT 'v1',
  product_family TEXT NOT NULL DEFAULT 'lumbar-fusion',
  branding JSONB NOT NULL DEFAULT '{}'::JSONB,
  controls JSONB NOT NULL DEFAULT '{}'::JSONB,
  models JSONB NOT NULL DEFAULT '{}'::JSONB,
  telemetry_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO embed_configs (
  embed_id,
  customer_name,
  allowed_origins,
  default_layout,
  release_id,
  branding,
  controls,
  models
) VALUES (
  'emb_pycad_staging',
  'PYCAD Internal Staging',
  ARRAY['https://pycad.co', 'https://www.pycad.co'],
  'section',
  'v1',
  '{"brandName":"PYCAD","brandTagline":"Interactive Implant Demo Portal","moduleLabel":"Lumbar Fusion","showHeader":true,"showFooter":true,"showSidePanel":true}'::JSONB,
  '{"cage":true,"pedicleScrews":true,"labels":false,"storyNavigation":true}'::JSONB,
  '{"initial":"models/lumbar-fusion-initial.glb","detail":"models/lumbar-fusion-detail.glb","mobile":"models/lumbar-fusion-mobile.glb"}'::JSONB
) ON CONFLICT (embed_id) DO NOTHING;
