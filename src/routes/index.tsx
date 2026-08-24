import { lazy, Suspense, type ReactNode } from 'react';
import { Route, Routes } from 'react-router';

import { RouteErrorBoundary } from '@/components/error-boundary';
import { ProductGridSkeleton } from '@/features/catalog/components/product-grid';

import { AdminLayout } from './admin-layout';
import { AdminRoute, GuestOnlyRoute, ProtectedRoute } from './guards';
import { RootLayout } from './root-layout';

// Lazy from the start: the route tree is where code splitting happens, and adding a screen
// should not mean rewiring how it loads.
const HomePage = lazy(() => import('./home'));
const ProductDetailPage = lazy(() => import('./product-detail'));
const SigninPage = lazy(() => import('./signin'));
const SignupPage = lazy(() => import('./signup'));
const ForgotPasswordPage = lazy(() => import('./forgot-password'));
const CartPage = lazy(() => import('./cart'));
const CheckoutPage = lazy(() => import('./checkout'));
const OrderConfirmationPage = lazy(() => import('./order-confirmation'));
const OrdersPage = lazy(() => import('./orders'));
const OrderDetailPage = lazy(() => import('./order-detail'));
const MyReviewsPage = lazy(() => import('./my-reviews'));
const AccountPage = lazy(() => import('./account'));
const AdminProductsPage = lazy(() => import('./admin'));
const AdminProductNewPage = lazy(() => import('./admin-product-new'));
const AdminProductEditPage = lazy(() => import('./admin-product-edit'));
const NotFoundPage = lazy(() => import('./not-found'));

/**
 * One boundary pair per route: errors are caught next to the screen that threw them, so a
 * crash in the catalog does not take the header and navigation down with it.
 */
function RouteBoundary({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={fallback ?? null}>{children}</Suspense>
    </RouteErrorBoundary>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route
          index
          element={
            <RouteBoundary fallback={<ProductGridSkeleton />}>
              <HomePage />
            </RouteBoundary>
          }
        />

        <Route
          path="products/:productId"
          element={
            <RouteBoundary>
              <ProductDetailPage />
            </RouteBoundary>
          }
        />

        {/* Already signed in? These screens have nothing to offer — bounce through. */}
        <Route element={<GuestOnlyRoute />}>
          <Route
            path="signin"
            element={
              <RouteBoundary>
                <SigninPage />
              </RouteBoundary>
            }
          />
          <Route
            path="signup"
            element={
              <RouteBoundary>
                <SignupPage />
              </RouteBoundary>
            }
          />
          <Route
            path="forgot-password"
            element={
              <RouteBoundary>
                <ForgotPasswordPage />
              </RouteBoundary>
            }
          />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route
            path="cart"
            element={
              <RouteBoundary>
                <CartPage />
              </RouteBoundary>
            }
          />

          <Route
            path="checkout"
            element={
              <RouteBoundary>
                <CheckoutPage />
              </RouteBoundary>
            }
          />

          <Route
            path="checkout/confirmation/:orderId"
            element={
              <RouteBoundary>
                <OrderConfirmationPage />
              </RouteBoundary>
            }
          />

          <Route
            path="orders"
            element={
              <RouteBoundary>
                <OrdersPage />
              </RouteBoundary>
            }
          />

          <Route
            path="orders/:orderId"
            element={
              <RouteBoundary>
                <OrderDetailPage />
              </RouteBoundary>
            }
          />

          <Route
            path="my-reviews"
            element={
              <RouteBoundary>
                <MyReviewsPage />
              </RouteBoundary>
            }
          />

          <Route
            path="account"
            element={
              <RouteBoundary>
                <AccountPage />
              </RouteBoundary>
            }
          />

          {/* Nested inside ProtectedRoute: "signed out" is answered before "not an admin". */}
          {/* Everything below is admin-only, inside its own layout. */}
          <Route element={<AdminRoute />}>
            <Route path="admin" element={<AdminLayout />}>
              <Route
                index
                element={
                  <RouteBoundary>
                    <AdminProductsPage />
                  </RouteBoundary>
                }
              />
              <Route
                path="products/new"
                element={
                  <RouteBoundary>
                    <AdminProductNewPage />
                  </RouteBoundary>
                }
              />
              <Route
                path="products/:productId/edit"
                element={
                  <RouteBoundary>
                    <AdminProductEditPage />
                  </RouteBoundary>
                }
              />
            </Route>
          </Route>
        </Route>

        <Route
          path="*"
          element={
            <RouteBoundary>
              <NotFoundPage />
            </RouteBoundary>
          }
        />
      </Route>
    </Routes>
  );
}
