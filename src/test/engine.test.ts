import { describe, it, expect } from 'vitest';
import { MM_TO_PX } from '../engine/types';

describe('Engine constants', () => {
  it('MM_TO_PX equals 10', () => {
    expect(MM_TO_PX).toBe(10);
  });

  it('converts mm to px correctly', () => {
    expect(28.5 * MM_TO_PX).toBe(285);
    expect(1 * MM_TO_PX).toBe(10);
  });
});
