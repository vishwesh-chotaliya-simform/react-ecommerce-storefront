import { Link, useLocation, useNavigate } from 'react-router';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SigninForm } from '@/features/auth/components/signin-form';

import { intendedPath, type RedirectState } from './redirect-state';
import { useDocumentTitle } from '@/lib/use-document-title';

export default function SigninPage() {
  useDocumentTitle('Sign in');

  const navigate = useNavigate();
  const location = useLocation();

  // Set by ProtectedRoute when it turned someone away. Land them back there, not on the home
  // page — being bounced to the catalog after signing in loses whatever they were doing.
  const destination = intendedPath(location.state);
  // Re-stated rather than forwarded: `location.state` is `any`, and the intent is just a path.
  const carried: RedirectState = { from: destination };

  return (
    <div className="mx-auto max-w-sm py-8">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 className="text-xl">Sign in</h1>
          </CardTitle>
          <CardDescription>Welcome back.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <SigninForm onSuccess={() => void navigate(destination, { replace: true })} />

          <p className="text-center text-sm text-muted-foreground">
            No account?{' '}
            <Link
              to="/signup"
              state={carried}
              className="text-foreground underline underline-offset-4"
            >
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
