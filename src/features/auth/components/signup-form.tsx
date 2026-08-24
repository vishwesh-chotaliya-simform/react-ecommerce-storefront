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

import { useSignup } from '../api';
import { signupSchema, type SignupValues } from '../schemas';
import { applyServerErrors } from '../server-errors';
import { FormAlert } from './form-alert';

const FIELDS = ['name', 'email', 'password'] as const;

export function SignupForm({ onSuccess }: { onSuccess: () => void }) {
  const signup = useSignup();

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const formError = form.formState.errors.root?.message;

  function onSubmit(values: SignupValues) {
    form.clearErrors('root');

    signup.mutate(values, {
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input autoComplete="name" placeholder="Ada Lovelace" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormDescription>At least 8 characters.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={signup.isPending}>
          {signup.isPending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </Form>
  );
}
