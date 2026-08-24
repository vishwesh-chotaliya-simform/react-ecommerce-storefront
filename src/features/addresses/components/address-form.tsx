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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormAlert } from '@/features/auth/components/form-alert';
import { applyServerErrors } from '@/features/auth/server-errors';

import { useAddAddress } from '../api';
import { addressSchema, type AddressValues } from '../schemas';
import type { CreateAddressBody } from '../types';

const FIELDS = ['addressLine1', 'city', 'state', 'pincode', 'tag'] as const;
const NO_TAG = 'none';

/**
 * Zod infers optionals as `tag?: Tag | undefined`; the request body declares `tag?: Tag`.
 * Under `exactOptionalPropertyTypes` those differ, and the honest fix is to leave the key out
 * rather than send an explicit `undefined`.
 */
function toCreateBody(values: AddressValues): CreateAddressBody {
  const body: CreateAddressBody = {
    addressLine1: values.addressLine1,
    city: values.city,
    state: values.state,
    pincode: values.pincode,
  };

  if (values.tag !== undefined) body.tag = values.tag;
  if (values.isDefault !== undefined) body.isDefault = values.isDefault;

  return body;
}

export function AddressForm({ onAdded }: { onAdded?: () => void }) {
  const addAddress = useAddAddress();

  const form = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: { addressLine1: '', city: '', state: '', pincode: '' },
  });

  const formError = form.formState.errors.root?.message;

  function onSubmit(values: AddressValues) {
    form.clearErrors('root');

    addAddress.mutate(toCreateBody(values), {
      onSuccess: () => {
        form.reset();
        onAdded?.();
      },
      onError: (error) => {
        const message = applyServerErrors(error, form.setError, FIELDS);
        if (message) form.setError('root', { message });
      },
    });
  }

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
        className="space-y-5"
      >
        {formError && <FormAlert message={formError} />}

        <FormField
          control={form.control}
          name="addressLine1"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input autoComplete="street-address" placeholder="221B Baker Street" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input autoComplete="address-level2" placeholder="Pune" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State</FormLabel>
                <FormControl>
                  <Input autoComplete="address-level1" placeholder="Maharashtra" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="pincode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pincode</FormLabel>
                <FormControl>
                  <Input inputMode="numeric" maxLength={6} placeholder="411001" {...field} />
                </FormControl>
                {/* Stated up front, not only after a rejected submit. */}
                <FormDescription>Exactly 6 digits.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tag"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Label</FormLabel>
                <Select
                  value={field.value ?? NO_TAG}
                  onValueChange={(value) =>
                    field.onChange(value === NO_TAG ? undefined : (value as AddressValues['tag']))
                  }
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NO_TAG}>No label</SelectItem>
                    <SelectItem value="home">Home</SelectItem>
                    <SelectItem value="office">Office</SelectItem>
                    <SelectItem value="work">Work</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={addAddress.isPending}>
          {addAddress.isPending ? 'Saving…' : 'Save address'}
        </Button>
      </form>
    </Form>
  );
}
