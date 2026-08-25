import { useState } from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form';
import { SuccessAlert } from '@/features/auth/components/form-alert';
import { ResetPasswordForm } from '@/features/auth/components/reset-password-form';
import { useDocumentTitle } from '@/lib/use-document-title';

interface IssuedOtp {
  email: string;
  /**
   * Undefined against a production API, which stops returning the code so that knowing an
   * email address is not enough to take over the account. There it goes to the server log.
   */
  otp: string | undefined;
}

export default function ForgotPasswordPage() {
  useDocumentTitle('Reset your password');

  const [issued, setIssued] = useState<IssuedOtp | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="mx-auto max-w-sm space-y-6 py-8">
        <SuccessAlert title="Password reset">
          Every existing session was signed out. Sign in with your new password.
        </SuccessAlert>
        <Button asChild className="w-full">
          <Link to="/signin">Go to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm py-8">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 className="text-xl">{issued ? 'Choose a new password' : 'Forgot password'}</h1>
          </CardTitle>
          <CardDescription>
            {issued
              ? 'Enter the code along with your new password.'
              : 'We will issue a 6-digit reset code.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {issued ? (
            <>
              {/* No mailer is wired up. In development the API hands the code back and it is
                  shown here; in production it is withheld and written to the server log
                  instead, so there is nothing to display and the field starts empty. */}
              {issued.otp ? (
                <SuccessAlert title={`Reset code: ${issued.otp}`}>
                  Returned directly by the API — no email is sent.
                </SuccessAlert>
              ) : (
                <SuccessAlert title="Reset code issued">
                  This demo sends no email. The code was written to the server log — ask whoever
                  runs the deployment for it.
                </SuccessAlert>
              )}

              <ResetPasswordForm
                defaultEmail={issued.email}
                defaultOtp={issued.otp ?? ''}
                onSuccess={() => setDone(true)}
              />
            </>
          ) : (
            <ForgotPasswordForm onSent={(email, otp) => setIssued({ email, otp })} />
          )}

          <p className="text-center text-sm text-muted-foreground">
            <Link to="/signin" className="text-foreground underline underline-offset-4">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
