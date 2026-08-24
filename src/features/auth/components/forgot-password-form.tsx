import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

import { useForgotPassword } from '../api';
import { forgotPasswordSchema, type ForgotPasswordValues } from '../schemas';
import { applyServerErrors } from '../server-errors';
import { FormAlert } from './form-alert';

const FIELDS = ['email'] as const;

export function ForgotPasswordForm({ onSent }: { onSent: (email: string, otp: string) => void }) {
  const forgotPassword = useForgotPassword();

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const formError = form.formState.errors.root?.message;

  function onSubmit(values: ForgotPasswordValues) {
    form.clearErrors('root');

    forgotPassword.mutate(values, {
      onSuccess: (result) => {
        onSent(values.email, result.otp);
      },
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
                <Input type="email" autoComplete="email" placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={forgotPassword.isPending}>
          {forgotPassword.isPending ? 'Requesting…' : 'Send reset code'}
        </Button>
      </form>
    </Form>
  );
}
