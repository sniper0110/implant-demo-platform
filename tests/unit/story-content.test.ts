import { describe, expect, it } from 'vitest';
import { getStorySteps, getNextStepIndex, getPreviousStepIndex } from '../../src/data/story';

describe('story content', () => {
  it('has three lumbar fusion steps', () => {
    expect(getStorySteps('lumbar-fusion')).toHaveLength(3);
  });
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

  it('wraps step navigation in a loop', () => {
    expect(getNextStepIndex(2, 3)).toBe(0);
    expect(getPreviousStepIndex(0, 3)).toBe(2);
    expect(getNextStepIndex(0, 3)).toBe(1);
    expect(getPreviousStepIndex(2, 3)).toBe(1);
  });
});
