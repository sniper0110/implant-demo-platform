import type { QualityTier } from './config';

interface NavigatorConnection {
  effectiveType?: string;
  saveData?: boolean;
  downlink?: number;
}

function getConnection(): NavigatorConnection | undefined {
  const nav = navigator as Navigator & { connection?: NavigatorConnection };
  return nav.connection;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function estimateMemoryGb(): number | undefined {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return nav.deviceMemory;
}

function isLikelyIOS(): boolean {
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function isCoarsePointerDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const noHover = window.matchMedia('(hover: none)').matches;
  const smallScreen = window.matchMedia('(max-width: 768px)').matches;
  return coarsePointer || noHover || smallScreen;
}

export function detectWebGLSupport(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export interface DeviceTierResult {
  tier: QualityTier;
  dprCap: number;
  shadows: boolean;
  antialias: boolean;
  frameloop: 'always' | 'demand';
  reducedMotion: boolean;
}

export function resolveDeviceTier(): DeviceTierResult {
  const connection = getConnection();
  const reducedMotion = prefersReducedMotion();
  const memory = estimateMemoryGb();
  const saveData = connection?.saveData === true;
  const slowNetwork =
    saveData ||
    connection?.effectiveType === 'slow-2g' ||
    connection?.effectiveType === '2g' ||
    connection?.effectiveType === '3g';
  const coarse = isCoarsePointerDevice();
  const ios = isLikelyIOS();

  if (coarse || ios) {
    const lowMemory = memory !== undefined && memory <= 2;
    return {
      tier: lowMemory ? 'low' : 'medium',
      dprCap: lowMemory ? 1 : 1.25,
      shadows: false,
      antialias: !lowMemory,
      // iOS Safari often fails to paint the first frame in demand mode inside iframes.
      frameloop: 'always',
      reducedMotion,
    };
  }

  if (reducedMotion || slowNetwork || (memory !== undefined && memory <= 2)) {
    return {
      tier: 'low',
      dprCap: 1,
      shadows: false,
      antialias: false,
      frameloop: 'demand',
      reducedMotion,
    };
  }

  if (memory !== undefined && memory <= 4) {
    return {
      tier: 'medium',
      dprCap: 1.25,
      shadows: false,
      antialias: true,
      frameloop: 'demand',
      reducedMotion,
    };
  }

  return {
    tier: 'high',
    dprCap: Math.min(window.devicePixelRatio, 2),
    shadows: true,
    antialias: true,
    frameloop: 'demand',
    reducedMotion,
  };
}

export function canUpgradeModelQuality(): boolean {
  const connection = getConnection();
  if (connection?.saveData === true) return false;
  const effectiveType = connection?.effectiveType;
  if (!effectiveType) return false;
  return effectiveType === '4g';
}

export function isNearViewport(element: Element, rootMargin = '200px'): boolean {
  const rect = element.getBoundingClientRect();
  const margin = parseInt(rootMargin, 10) || 200;
  return rect.bottom >= -margin && rect.top <= window.innerHeight + margin;
}
