import { z } from 'zod';

/**
 * Mirrors `../node-mongodb-ecommerce-project/src/modules/addresses/address.validation.ts`.
 *
 * The rules are copied exactly, including the six-digit pincode. The wording is the one
 * difference: the server phrases required fields as `addressLine1 is required`, which reads
 * as a field name rather than a sentence under an input labelled "Address". Anything the
 * client lets through still comes back as `ApiError.fields` and lands on the same input.
 */
export const addressSchema = z.object({
  addressLine1: z.string().trim().min(1, 'Address line 1 is required'),
  city: z.string().trim().min(1, 'City is required'),
  state: z.string().trim().min(1, 'State is required'),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Pincode must be a 6-digit number'),
  tag: z.enum(['home', 'office', 'work']).optional(),
  isDefault: z.boolean().optional(),
});

export type AddressValues = z.infer<typeof addressSchema>;
