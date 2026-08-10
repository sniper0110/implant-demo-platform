import { describe, expect, it } from 'vitest';
import { getStorySteps } from '../../src/data/story';

describe('story content', () => {
  it('does not mention rods in lumbar callouts', () => {
    const steps = getStorySteps('lumbar-fusion');
    const callouts = steps.flatMap((step) => step.callouts);
    for (const callout of callouts) {
      expect(callout.toLowerCase()).not.toContain('rod');
    }
  });

  it('uses posterior fixation wording on the full construct step', () => {
    const [fullConstruct] = getStorySteps('lumbar-fusion');
    expect(fullConstruct.callouts).toContain('Posterior segmental fixation');
  });
});
