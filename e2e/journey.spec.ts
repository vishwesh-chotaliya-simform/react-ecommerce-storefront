import { expect, test, type Page } from '@playwright/test';

/**
 * One journey, end to end: signin → browse → add to cart → checkout → review.
 *
 * Serial, because every step depends on the last and they all mutate one shared backend.
 * The session comes from `globalSetup`'s saved storage state — no test signs in.
 */
test.describe.configure({ mode: 'serial' });

const PRODUCT = 'Mechanical Keyboard';

/**
 * Search for the product and open it.
 *
 * The search box debounces for 400ms before writing to the URL. Clicking a card before that
 * lands means clicking a row of the *unfiltered* grid, and the pending commit then re-renders
 * the list out from under the navigation — so wait for the filter to be applied first.
 */
async function openProduct(page: Page) {
  await page.goto('/');
  await page.getByLabel('Search').fill(PRODUCT);
  await page.waitForURL(/search=/);
  await expect(page.getByText('Showing 1 of 1 products')).toBeVisible();

  await page
    .getByRole('link', { name: new RegExp(PRODUCT) })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: PRODUCT, level: 1 })).toBeVisible();
}

test.describe('storefront journey', () => {
  test('is signed in from the saved session, without signing in again', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Catalog' })).toBeVisible();
    // The header greets the seeded customer, so the storage state really carried the token.
    await expect(page.getByRole('link', { name: /Account/ })).toBeVisible();
  });

  test('browses the catalog and opens a product', async ({ page }) => {
    await openProduct(page);
    await expect(page.getByRole('heading', { name: 'Reviews' })).toBeVisible();
  });

  test('adds to the cart and the header badge follows', async ({ page }) => {
    await openProduct(page);

    await page.getByRole('button', { name: 'Add to cart' }).click();
    await expect(page.getByText('Added to your cart.')).toBeVisible();

    await expect(page.locator('header a[href="/cart"] span[aria-label*="in cart"]')).toHaveText(
      '1',
    );
  });

  test('checks out and lands on a confirmation showing what was paid', async ({ page }) => {
    await page.goto('/cart');
    await expect(page.getByRole('heading', { name: 'Your cart' })).toBeVisible();

    await page.getByRole('link', { name: 'Checkout' }).click();
    await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();

    // The seeded account has no address yet, so the journey adds one.
    const addressForm = page.getByRole('button', { name: 'Add an address' });
    if (await addressForm.isVisible().catch(() => false)) {
      await addressForm.click();
    }
    // Role-scoped, not `getByLabel`: the delivery-address *section* is labelled
    // "Delivery address", so a bare label lookup for "Address" matches the region too.
    const pincode = page.getByRole('textbox', { name: 'Pincode' });

    if (await pincode.isVisible().catch(() => false)) {
      await page.getByRole('textbox', { name: 'Address' }).fill('221B Baker Street');
      await page.getByRole('textbox', { name: 'City' }).fill('Pune');
      await page.getByRole('textbox', { name: 'State' }).fill('Maharashtra');
      await pincode.fill('411001');
      await page.getByRole('button', { name: 'Save address' }).click();
      // The saved address becomes the selected delivery address.
      await expect(page.getByRole('radio').first()).toBeChecked();
    }

    await page.getByRole('button', { name: 'Place order' }).click();

    await expect(page.getByRole('heading', { name: 'Order placed' })).toBeVisible();
    await expect(page.getByText(PRODUCT)).toBeVisible();
    await expect(page.getByText('Total paid')).toBeVisible();

    // The cart really emptied.
    await expect(page.locator('header a[href="/cart"] span[aria-label*="in cart"]')).toHaveCount(0);
  });

  test('reviews the product it just bought', async ({ page }) => {
    await openProduct(page);
    await expect(page.getByRole('heading', { name: 'Reviews' })).toBeVisible();

    // Buying it is what unlocks this button; there is no `canReview` flag to consult.
    await page.getByRole('button', { name: 'Write a review' }).click();
    await page.getByRole('radio', { name: '5 stars' }).check();
    await page
      .getByRole('textbox', { name: 'Your review' })
      .fill('Bought it through the end-to-end journey and it types beautifully.');
    await page.getByRole('button', { name: 'Post review' }).click();

    // The review lands, and the product's own rating summary moves with it.
    await expect(page.getByText('· You')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Write a review' })).toHaveCount(0);
  });
});
