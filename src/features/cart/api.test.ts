import { describe, expect, it } from 'vitest';

import { KEYBOARD, MOUSE, cartWith } from '@/test/msw/fixtures';

import { cartItemCount, cartTotal } from './api';

describe('cart maths', () => {
  it('counts units, not lines', () => {
    // Two lines, five units — the header badge shows units.
    expect(cartItemCount(cartWith([KEYBOARD, 2], [MOUSE, 3]))).toBe(5);
  });

  it('totals price × quantity across lines', () => {
    expect(cartTotal(cartWith([KEYBOARD, 2], [MOUSE, 3]))).toBe(4999 * 2 + 2499 * 3);
  });

  it('treats an absent cart as empty rather than throwing', () => {
    // The query is `undefined` until it resolves, and the header renders before that.
    expect(cartItemCount(undefined)).toBe(0);
    expect(cartTotal(undefined)).toBe(0);
    expect(cartItemCount([])).toBe(0);
    expect(cartTotal([])).toBe(0);
  });

  it('is derived, never stored — recomputing gives the same answer', () => {
    const items = cartWith([KEYBOARD, 1]);
    expect(cartTotal(items)).toBe(cartTotal(items));
    expect(cartTotal([...items, ...cartWith([MOUSE, 1])])).toBe(4999 + 2499);
  });
});
