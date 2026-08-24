import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';

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

import { useSignin } from '../api';
import { signinSchema, type SigninValues } from '../schemas';
import { applyServerErrors } from '../server-errors';
import { FormAlert } from './form-alert';

const FIELDS = ['email', 'password'] as const;

export function SigninForm({ onSuccess }: { onSuccess: () => void }) {
  const signin = useSignin();

  const form = useForm<SigninValues>({
    resolver: zodResolver(signinSchema),
    defaultValues: { email: '', password: '' },
  });

  // `root` is React Hook Form's slot for errors that belong to no single input.
  const formError = form.formState.errors.root?.message;

  function onSubmit(values: SigninValues) {
    form.clearErrors('root');

    signin.mutate(values, {
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
                <Input type="email" autoComplete="email" placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Password</FormLabel>
                <Link
                  to="/forgot-password"
                  className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <FormControl>
                <Input type="password" autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={signin.isPending}>
          {signin.isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </Form>
  );
}
