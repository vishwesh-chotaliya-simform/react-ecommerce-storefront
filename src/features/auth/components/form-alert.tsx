import { AlertCircle, CheckCircle2 } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/**
 * A form-level message — the ones with no single input to blame: `Invalid email or password`,
 * `Email is already registered`. The server's wording is shown verbatim.
 */
export function FormAlert({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertTitle>That didn't work</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function SuccessAlert({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <Alert>
      <CheckCircle2 />
      <AlertTitle>{title}</AlertTitle>
      {children && <AlertDescription>{children}</AlertDescription>}
    </Alert>
  );
}
