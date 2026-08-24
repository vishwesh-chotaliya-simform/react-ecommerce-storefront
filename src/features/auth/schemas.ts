import { z } from 'zod';

/**
 * Client-side mirrors of the backend's Zod schemas in
 * `../node-mongodb-ecommerce-project/src/modules/users/user.validation.ts`.
 *
 * The rules and the message wording are copied deliberately, so a field the browser rejects
 * reads identically to the same field rejected by the server. Anything that slips past these
 * still comes back as `ApiError.fields` and lands on the same input.
 *
 * `.trim()` and `.toLowerCase()` are transforms on the backend too — matching them here means
 * `  Ada@Shop.dev ` is the same submission on both sides.
 */

const email = z.string().trim().toLowerCase().pipe(z.email('Invalid email address'));

export const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters long'),
  email,
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

export const signinSchema = z.object({
  email,
  // The backend only requires non-empty here — it must not leak the password policy to
  // someone guessing at an existing account.
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  email,
  otp: z.string().regex(/^\d{6}$/, 'OTP must be a 6-digit number'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters long'),
});

export type SignupValues = z.infer<typeof signupSchema>;
export type SigninValues = z.infer<typeof signinSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
