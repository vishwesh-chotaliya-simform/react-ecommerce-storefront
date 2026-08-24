/**
 * `price` is a plain positive number on the backend with no currency field anywhere in the
 * schema. The seed catalog (4999 for a keyboard, 2499 for a mouse) and the Indian 6-digit
 * pincode rule on addresses both read as whole rupees, so that is what we render.
 */
const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatPrice(value: number): string {
  return currency.format(value);
}

const decimal = new Intl.NumberFormat('en-IN');

export function formatCount(value: number): string {
  return decimal.format(value);
}
