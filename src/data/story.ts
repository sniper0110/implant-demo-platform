import type { ProductFamily, StoryStep } from '../types';

export const STORY_STEPS_BY_FAMILY: Record<ProductFamily, StoryStep[]> = {
  'lumbar-fusion': [
    {
      id: 'lumbar-full',
      title: 'Complete Fusion Construct',
      subtitle: 'Step 01 — Full Construct',
      implantName: 'L4–L5 Fusion Construct',
      anatomyLevel: 'L4–L5',
      callouts: [
        'Interbody cage in disc space',
        'Bilateral pedicle fixation',
        'Posterior segmental fixation',
      ],
      sceneMode: 'full-construct',
      productId: 'solar-psi',
    },
    {
      id: 'lumbar-cage',
      title: 'Interbody Cage',
      subtitle: 'Step 02 — Solar PSI',
      implantName: 'Solar PSI Interbody Cage',
      anatomyLevel: 'L4–L5 Disc Space',
      callouts: [
        'Lordotic footprint profile',
        'Endplate contact surface',
        'Central graft window',
      ],
      sceneMode: 'interbody-cage',
      productId: 'solar-psi',
    },
    {
      id: 'lumbar-posterior',
      title: 'Posterior Fixation',
      subtitle: 'Step 03 — E3 / F1',
      implantName: 'E3 / F1 Pedicle System',
      anatomyLevel: 'L2–L4 Posterior',
      callouts: [
        'Polyaxial screw heads',
        'Posterior fixation hardware',
        'Cross-connector stabilization',
      ],
      sceneMode: 'pedicle-system',
      productId: 'e3-f1',
    },
  ],
  'vertebral-augmentation': [
    {
      id: 'vad-overview',
      title: 'Vertebral Augmentation',
      subtitle: 'Step 01 — Overview',
      implantName: 'Augmenta VAD',
      anatomyLevel: 'L3 Vertebra',
      callouts: [
        'Minimally invasive access',
        'Controlled fill delivery',
        'Vertebral body support',
      ],
      sceneMode: 'vad',
      productId: 'augmenta-vad',
    },
    {
      id: 'vad-access',
      title: 'Access Trajectory',
      subtitle: 'Step 02 — Cannula Placement',
      implantName: 'Augmenta VAD — Access',
      anatomyLevel: 'L3 Anterior Access',
      callouts: [
        'Bilateral cannula paths',
        'Trajectory visualization',
        'Minimally invasive corridor',
      ],
      sceneMode: 'vad',
      productId: 'augmenta-vad',
    },
    {
      id: 'vad-fill',
      title: 'Fill Delivery',
      subtitle: 'Step 03 — Material Distribution',
      implantName: 'Augmenta VAD — Fill',
      anatomyLevel: 'L3 Vertebral Body',
      callouts: [
        'Controlled cement fill',
        'Distribution pattern',
        'Load-bearing support',
      ],
      sceneMode: 'vad',
      productId: 'augmenta-vad',
    },
    {
      id: 'vad-bilateral',
      title: 'Bilateral Augmentation',
      subtitle: 'Step 04 — Complete View',
      implantName: 'Augmenta VAD — Bilateral',
      anatomyLevel: 'L3 Bilateral',
      callouts: [
        'Symmetric bilateral access',
        'Balanced fill distribution',
        'Structural restoration concept',
      ],
      sceneMode: 'vad',
      productId: 'augmenta-vad',
    },
  ],
};

export function getStorySteps(family: ProductFamily): StoryStep[] {
  return STORY_STEPS_BY_FAMILY[family];
}

export function getDefaultStepIndex(_family: ProductFamily): number {
  return 0;
}

export function getNextStepIndex(currentIndex: number, totalSteps: number): number {
  if (totalSteps <= 0) return 0;
  return (currentIndex + 1) % totalSteps;
}

export function getPreviousStepIndex(currentIndex: number, totalSteps: number): number {
  if (totalSteps <= 0) return 0;
  return (currentIndex - 1 + totalSteps) % totalSteps;
}
