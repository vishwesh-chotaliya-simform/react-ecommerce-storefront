import { Link, useLocation, useNavigate } from 'react-router';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SignupForm } from '@/features/auth/components/signup-form';

import { intendedPath, type RedirectState } from './redirect-state';
import { useDocumentTitle } from '@/lib/use-document-title';

export default function SignupPage() {
  useDocumentTitle('Create an account');

  const navigate = useNavigate();
  const location = useLocation();
  const destination = intendedPath(location.state);
  // Re-stated rather than forwarded: `location.state` is `any`, and the intent is just a path.
  const carried: RedirectState = { from: destination };

  return (
    <div className="mx-auto max-w-sm py-8">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 className="text-xl">Create an account</h1>
          </CardTitle>
          <CardDescription>Signing up creates a customer account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <SignupForm onSuccess={() => void navigate(destination, { replace: true })} />

          <p className="text-center text-sm text-muted-foreground">
            Already registered?{' '}
            <Link
              to="/signin"
              state={carried}
              className="text-foreground underline underline-offset-4"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
