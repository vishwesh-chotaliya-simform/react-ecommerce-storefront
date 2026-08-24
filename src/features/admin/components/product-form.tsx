import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';

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
import { FormAlert } from '@/features/auth/components/form-alert';
import { applyServerErrors } from '@/features/auth/server-errors';

import { useCreateProduct, useUpdateProduct } from '../api';
import { productSchema, type ProductValues } from '../schemas';
import type { AdminProduct } from '../types';
import { ImagePreview } from './image-preview';

const FIELDS = ['title', 'description', 'imageURL', 'price', 'stock'] as const;

interface ProductFormProps {
  /** Present when editing; absent when creating. */
  product?: AdminProduct;
  onDone: () => void;
  onCancel: () => void;
}

/**
 * One form for both create and edit.
 *
 * The only differences are which mutation runs and what the button says — the fields, the
 * schema, and the error handling are shared, so a rule can never drift between the two paths.
 */
export function ProductForm({ product, onDone, onCancel }: ProductFormProps) {
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const mutation = product ? update : create;

  const form = useForm<ProductValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: product?.title ?? '',
      description: product?.description ?? '',
      imageURL: product?.imageURL ?? '',
      price: product?.price ?? 0,
      stock: product?.stock ?? 0,
    },
  });

  const formError = form.formState.errors.root?.message;
  // `useWatch`, not `form.watch()` — the latter returns a function the React Compiler cannot
  // memoize, which makes it skip compiling the whole component.
  const imageURL = useWatch({ control: form.control, name: 'imageURL' });
  const title = useWatch({ control: form.control, name: 'title' });

  function onSubmit(values: ProductValues) {
    form.clearErrors('root');

    const onError = (error: unknown) => {
      const message = applyServerErrors(error, form.setError, FIELDS);
      if (message) form.setError('root', { message });
    };

    if (product) {
      // Every field, every time: `PUT` replaces the resource even though the server's schema
      // would tolerate a fragment.
      update.mutate({ productId: product._id, body: values }, { onSuccess: onDone, onError });
    } else {
      create.mutate(values, { onSuccess: onDone, onError });
    }
  }

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
        className="space-y-6"
      >
        {formError && <FormAlert message={formError} />}

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Mechanical Keyboard" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <textarea
                  rows={4}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
                  placeholder="What is it, and who is it for?"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    {...field}
                    value={String(field.value)}
                    // Numbers, not strings: an empty box becomes NaN so the schema reports
                    // "Price is required" rather than the server rejecting `""`.
                    onChange={(event) => field.onChange(event.target.valueAsNumber)}
                  />
                </FormControl>
                <FormDescription>Zero or more.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="stock"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stock</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    {...field}
                    value={String(field.value)}
                    onChange={(event) => field.onChange(event.target.valueAsNumber)}
                  />
                </FormControl>
                <FormDescription>Zero or more.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="imageURL"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image URL</FormLabel>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex-1 space-y-2">
                  <FormControl>
                    <Input placeholder="https://example.com/product.jpg" {...field} />
                  </FormControl>
                  <FormDescription>
                    A plain URL — there is no upload. The preview updates as you type.
                  </FormDescription>
                  <FormMessage />
                </div>
                <ImagePreview url={imageURL} alt={title || 'Product image preview'} />
              </div>
            </FormItem>
          )}
        />

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : product ? 'Save changes' : 'Create product'}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={mutation.isPending}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
