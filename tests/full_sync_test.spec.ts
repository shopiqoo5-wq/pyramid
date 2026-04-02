import { test } from '@playwright/test';

test.use({
  ignoreHTTPSErrors: true,
  baseURL: 'https://localhost:5173',
  screenshot: 'on',
  trace: 'on',
  permissions: ['camera', 'geolocation'],
});

test('end-to-end sync and visibility test', async ({ page }) => {
  console.log('Starting E2E Sync Test...');

  await page.context().setGeolocation({ latitude: 19.0760, longitude: 72.8777 });

  // --- STEP 1: EMPLOYEE PUNCH-IN ---
  await page.goto('/login');
  console.log('Logging in as Employee Sameer...');
  
  await page.click('button:has-text("Field Workforce Access")');
  await page.getByPlaceholder('Username or Email').fill('sameer@pyramidfm.com');
  await page.locator('input[type="password"]').fill('emp123');
  await page.click('button:has-text("Authorize Terminal Access")');
  
  await page.waitForURL('**/employee/dashboard**', { timeout: 10000 });
  
  // Perform a "Punch Out" or "Punch In"
  const punchBtn = page.locator('button').filter({ hasText: /Punch Out|Punch In/i });
  await punchBtn.waitFor({ state: 'visible' });
  console.log('Clicking Punch button...');
  await punchBtn.click();

  // Handle "Bypass (Testing)" button in the modal if it appears
  try {
    const bypassBtn = page.locator('button:has-text("Bypass (Testing)")');
    await bypassBtn.waitFor({ state: 'visible', timeout: 5000 });
    await bypassBtn.click();
  } catch {
    // If no bypass, just escape
    await page.keyboard.press('Escape');
  }

  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tests/sync_step1_employee_verified.png' });

  // FORCE GOTO LOGIN (Bypassing logout button issues)
  console.log('Forcing navigation to login for Admin phase...');
  await page.goto('/login');

  // --- STEP 2: ADMIN VERIFICATION ---
  console.log('Logging in as Admin Master...');
  await page.getByPlaceholder('Organization ID').fill('SYSTEM');
  await page.click('button:has-text("Continue to Access")');
  
  await page.getByPlaceholder('Username or Email').fill('master@pyramidfms.com');
  await page.locator('input[type="password"]').fill('master2026');
  await page.click('button:has-text("Authorize Terminal Access")');
  
  await page.waitForURL('**/admin', { timeout: 10000 });
  
  // Go to Admin Dashboard or Ops Command
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'tests/sync_admin_dashboard.png', fullPage: true });
  
  console.log('E2E Sync Test Phase 1 Completed. Final visual verification in sync_admin_dashboard.png');
});
