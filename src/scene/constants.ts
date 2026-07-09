import type { ProductId } from '../types';

export const COLORS = {
  bone: '#c8b89a',
  boneDark: '#a89878',
  disc: '#4a6a5a',
  discDark: '#3a5548',
  titanium: '#b8bcc4',
  titaniumDark: '#8a9098',
  gold: '#ffc800',
  goldDark: '#c9a000',
  lattice: '#9aa0a8',
  cement: '#d4c8a8',
  accent: '#6a8aaa',
} as const;

export const EXPLODE_OFFSETS: Record<string, [number, number, number]> = {
  cage: [0, 0.6, 0],
  plate: [0, 0.8, 0.4],
  screwL: [-0.5, 0.4, 0],
  screwR: [0.5, 0.4, 0],
  rodL: [-0.8, 0, 0],
  rodR: [0.8, 0, 0],
  vad: [0, 0.5, 0.6],
};

export function getRegionForProduct(productId: ProductId): 'lumbar' | 'cervical' {
  return productId === 'hyper-c' ? 'cervical' : 'lumbar';
}
