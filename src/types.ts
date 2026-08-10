export type ProductId =
  | 'solar-psi'
  | 'impulse-am'
  | 'hyper-c'
  | 'e3-f1'
  | 'augmenta-vad';

export type ProductFamily = 'lumbar-fusion' | 'vertebral-augmentation';

export type SceneMode =
  | 'full-construct'
  | 'interbody-cage'
  | 'pedicle-system'
  | 'vad';

export type SpineRegion = 'lumbar' | 'cervical';

export interface Product {
  id: ProductId;
  name: string;
  shortName: string;
  category: string;
  region: SpineRegion;
  family: ProductFamily;
  description: string;
  highlights: string[];
  implantType: 'interbody' | 'cervical-plate' | 'pedicle-screw' | 'vad';
}

export interface StoryStep {
  id: string;
  title: string;
  subtitle: string;
  implantName: string;
  anatomyLevel: string;
  callouts: [string, string, string];
  sceneMode: SceneMode;
  productId: ProductId;
}

export interface ViewToggles {
  anatomyOpacity: number;
  cage: boolean;
  pedicleScrews: boolean;
  labels: boolean;
}

export type SceneToggleKey = keyof Pick<ViewToggles, 'cage' | 'pedicleScrews' | 'labels'>;
