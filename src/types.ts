export type ProductId =
  | 'solar-psi'
  | 'impulse-am'
  | 'hyper-c'
  | 'e3-f1'
  | 'augmenta-vad';

export type SpineRegion = 'lumbar' | 'cervical';

export interface Product {
  id: ProductId;
  name: string;
  shortName: string;
  category: string;
  region: SpineRegion;
  description: string;
  highlights: string[];
  implantType: 'interbody' | 'cervical-plate' | 'pedicle-screw' | 'vad';
}

export interface StoryStep {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  productId: ProductId;
  callout?: string;
  camera: {
    position: [number, number, number];
    target: [number, number, number];
  };
}

export interface ViewToggles {
  anatomy: boolean;
  implant: boolean;
  labels: boolean;
  explode: boolean;
}

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
}
