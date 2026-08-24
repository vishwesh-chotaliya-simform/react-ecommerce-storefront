import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

import { useResetPassword } from '../api';
import { resetPasswordSchema, type ResetPasswordValues } from '../schemas';
import { applyServerErrors } from '../server-errors';
import { FormAlert } from './form-alert';

const FIELDS = ['email', 'otp', 'newPassword'] as const;

interface ResetPasswordFormProps {
  defaultEmail?: string;
  defaultOtp?: string;
  onSuccess: () => void;
}

export function ResetPasswordForm({
  defaultEmail = '',
  defaultOtp = '',
  onSuccess,
}: ResetPasswordFormProps) {
  const resetPassword = useResetPassword();

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: defaultEmail, otp: defaultOtp, newPassword: '' },
  });

  const formError = form.formState.errors.root?.message;

  function onSubmit(values: ResetPasswordValues) {
    form.clearErrors('root');

    resetPassword.mutate(values, {
      onSuccess,
      onError: (error) => {
        const message = applyServerErrors(error, form.setError, FIELDS);
        if (message) form.setError('root', { message });
      },
    });
  }

  return (
    <Form {...form}>
      {/* `noValidate` hands validation to Zod. Without it the browser's own constraint check
          fires first on `type="email"`, silently blocking submit — so the field never gets the
          message that mirrors the backend's wording, it gets a native bubble instead. */}
      <form
        noValidate
        onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
        className="space-y-5"
      >
        {formError && <FormAlert message={formError} />}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="otp"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reset code</FormLabel>
              <FormControl>
                <Input inputMode="numeric" maxLength={6} placeholder="123456" {...field} />
              </FormControl>
              <FormDescription>The 6-digit code from the previous step.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New password</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormDescription>At least 8 characters.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={resetPassword.isPending}>
          {resetPassword.isPending ? 'Resetting…' : 'Reset password'}
        </Button>
      </form>
    </Form>
  );
}
