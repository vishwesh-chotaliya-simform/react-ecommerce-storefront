import type { AuthUser } from '@/features/auth/types';
import type { CartItem } from '@/features/cart/types';

/** Product projection the cart endpoint returns — trimmed, not the full catalog product. */
export const KEYBOARD = {
  _id: 'p-keyboard',
  title: 'Mechanical Keyboard',
  price: 4999,
  imageURL: 'https://example.test/keyboard.jpg',
  stock: 10,
};

export const MOUSE = {
  _id: 'p-mouse',
  title: 'Wireless Mouse',
  price: 2499,
  imageURL: 'https://example.test/mouse.jpg',
  stock: 40,
};

export const cartWith = (...items: [typeof KEYBOARD, number][]): CartItem[] =>
  items.map(([product, quantity]) => ({ product, quantity }));

export const CUSTOMER: AuthUser = {
  _id: 'u-customer',
  name: 'Test Customer',
  email: 'customer@shop.dev',
  type: 'customer',
  cart: [],
  addresses: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const ADMIN: AuthUser = { ...CUSTOMER, _id: 'u-admin', name: 'Admin User', type: 'admin' };
