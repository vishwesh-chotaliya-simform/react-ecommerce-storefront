import { describe, expect, it } from 'vitest';

import { ApiError, toApiError } from './api-error';

/**
 * The parser has to cope with both shapes the backend actually sends. A suite that only
 * covered the joined Zod string would leave the Mongoose branch untested, and vice versa.
 */
describe('toApiError', () => {
  it('splits a joined Zod rejection into per-field messages', () => {
    const error = toApiError(
      400,
      'email: Invalid email address; password: Password must be at least 8 characters long',
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error.fields).toEqual({
      email: 'Invalid email address',
      password: 'Password must be at least 8 characters long',
    });
  });

  it('accepts a Mongoose ValidationError object keyed by field', () => {
    const error = toApiError(400, {
      pincode: 'Pincode must be a 6-digit number',
      city: 'City is required',
    });

    expect(error.fields).toEqual({
      pincode: 'Pincode must be a 6-digit number',
      city: 'City is required',
    });
    // A readable summary is still produced for the form-level slot.
    expect(error.message).toContain('Pincode must be a 6-digit number');
  });

  it('leaves prose alone, even when it contains a colon or semicolons', () => {
    for (const message of [
      'Insufficient stock for "Desk Mat", only 2 left.',
      'Cart is empty. Add items before placing an order.',
      'minPrice and maxPrice must be provided together',
      'You can only review products you have purchased',
    ]) {
      const error = toApiError(400, message);
      expect(error.fields).toEqual({});
      expect(error.message).toBe(message);
    }
  });

  it('handles dotted field paths', () => {
    expect(toApiError(400, 'address.pincode: Pincode must be exactly 6 digits').fields).toEqual({
      'address.pincode': 'Pincode must be exactly 6 digits',
    });
  });

  it('classifies client errors and 401s', () => {
    expect(toApiError(403, 'nope').isClientError).toBe(true);
    expect(toApiError(500, 'nope').isClientError).toBe(false);
    expect(toApiError(401, 'nope').isUnauthorized).toBe(true);
  });
});
