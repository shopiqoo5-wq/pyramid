import { test, expect } from '@playwright/test';

test.use({
  ignoreHTTPSErrors: true,
  baseURL: 'https://localhost:5174',
  screenshot: 'on',
  trace: 'on',
});

test('Check all major buttons in Admin and Employee flows', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      if (consoleErrors.length <= 5) console.log(`   🔴 Console Error: ${msg.text().slice(0, 100)}...`);
    } else if (msg.text().includes('✅ Synced')) {
        console.log(`   💎 Sync Event: ${msg.text()}`);
    }
  });

  console.log('Starting All Buttons Check...');

  // --- ADMIN FLOW ---
  console.log('Navigating to root for Admin login...');
  await page.goto('/');
  
  // Corporate Identity
  const orgInput = page.getByPlaceholder('Organization ID');
  await orgInput.fill('SYSTEM');
  await page.click('button:has-text("Continue")');

  // Personnel Login
  const userInput = page.getByPlaceholder('Username or Email');
  await userInput.fill('master@pyramidfms.com');
  await page.locator('input[type="password"]').fill('master2026');
  await page.click('button:has-text("Authorize")');

  // Wait for /admin
  await page.waitForURL('**/admin', { timeout: 15000 });
  console.log('Admin Login successful!');
  await page.waitForTimeout(4000); // Wait for sync to finish

  const adminPages = ['/admin', '/admin/analytics', '/admin/contracts'];
  
  for (const path of adminPages) {
    console.log(`Checking admin page: ${path}`);
    await page.goto(path);
    await page.waitForTimeout(3000);
    
    // Wider selector for interactions
    const buttons = page.locator('button:visible, select:visible, .nav-item:visible');
    const count = await buttons.count();
    console.log(`   ⚡ Found ${count} interactive elements on ${path}`);

    // Log the labels for verification
    for (let i = 0; i < count; i++) {
        const text = await buttons.nth(i).innerText();
        if (text) console.log(`      [-] Button found: "${text.trim().split('\n')[0]}"`);
    }

    // click up to 5 non-navigation buttons
    let clicks = 0;
    for (let i = 0; i < count && clicks < 5; i++) {
      const btn = buttons.nth(i);
      const text = (await btn.innerText()).toLowerCase();
      if (text.includes('logout') || text.includes('sign out') || text.includes('admin')) continue;
      
      try {
        console.log(`      🖱️ Clicking: "${text.trim().split('\n')[0]}"`);
        await btn.click({ timeout: 3000 }).catch(() => {});
        clicks++;
        await page.waitForTimeout(500);
      } catch (e) {}
    }
    await page.screenshot({ path: `tests/final_check_admin_${path.replace(/\//g, '_')}.png` });
  }

  // --- EMPLOYEE FLOW ---
  console.log('Switching to Employee Flow...');
  await page.goto('/login');
  await page.click('button:has-text("Field Workforce Access")');
  await userInput.fill('sameer@pyramidfm.com');
  await page.locator('input[type="password"]').fill('emp123');
  await page.click('button:has-text("Authorize")');

  await page.waitForURL('**/employee/dashboard**', { timeout: 10000 });
  console.log('Employee Login successful!');
  await page.waitForTimeout(3000);

  const employeePages = ['/employee/dashboard', '/employee/protocols'];
  for (const path of employeePages) {
    console.log(`Checking employee page: ${path}`);
    await page.goto(path);
    await page.waitForTimeout(3000);

    const buttons = page.locator('button:visible, .nav-tab-field:visible');
    const count = await buttons.count();
    console.log(`   ⚡ Found ${count} interactive elements on ${path}`);

    for (let i = 0; i < count && i < 10; i++) {
        const text = await buttons.nth(i).innerText();
        if (text.toLowerCase().includes('logout')) continue;
        console.log(`      🖱️ Clicking employee item: "${text.trim().split('\n')[0]}"`);
        await buttons.nth(i).click({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(500);
    }
  }

  console.log('Buttons check completed!');
});
