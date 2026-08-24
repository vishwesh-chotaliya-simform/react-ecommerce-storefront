import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSession } from '@/features/auth/use-session';
import { useDocumentTitle } from '@/lib/use-document-title';

/**
 * A protected screen with nothing on it but the session itself — enough to prove the guard
 * and the `GET /users/me` bootstrap work. The real account screens arrive with addresses
 * (Phase 4) and orders (Phase 5).
 */
export default function AccountPage() {
  useDocumentTitle('Account');

  const { user } = useSession();

  if (!user) return null;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="text-sm text-muted-foreground">Signed in and confirmed by the server.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{user.name}</CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Role</span>
            <Badge variant={user.type === 'admin' ? 'default' : 'secondary'}>{user.type}</Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/orders">Your orders</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/my-reviews">Your reviews</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
