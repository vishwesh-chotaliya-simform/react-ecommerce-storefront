import { z } from 'zod';

/**
 * Mirrors `../node-mongodb-ecommerce-project/src/modules/products/product.validation.ts`.
 *
 * One schema for both create and edit. The server's update route uses `.partial()` of the
 * same shape, but the client always sends every field — a `PUT` that replaces the resource
 * should carry the whole resource — so the same rules apply to both paths.
 *
 * `min(0)` and not `positive()`: the backend accepts zero for both price and stock, and a
 * free product or a sold-out one are both legitimate. Note it also does not require stock to
 * be a whole number, so neither does this — rejecting client-side what the server would
 * accept is its own kind of bug.
 */
export const productSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().trim().min(1, 'Description is required'),
  imageURL: z.string().trim().min(1, 'Image URL is required'),
  price: z
    .number('Price is required')
    .min(0, 'Price must be a positive number')
    .refine(Number.isFinite, 'Price must be a number'),
  stock: z
    .number('Stock is required')
    .min(0, 'Stock must be a positive number')
    .refine(Number.isFinite, 'Stock must be a number'),
});

export type ProductValues = z.infer<typeof productSchema>;
