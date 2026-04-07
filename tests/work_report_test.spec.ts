import { test, expect } from '@playwright/test';
import path from 'path';

test.use({
  ignoreHTTPSErrors: true,
  baseURL: 'https://localhost:5173',
  screenshot: 'on',
  permissions: ['camera', 'geolocation'],
});

test('Work Report Submission Test', async ({ page }) => {
  console.log('Starting Work Report Submission Test...');

  // Set geo to bypass geofence if needed
  await page.context().setGeolocation({ latitude: 19.0760, longitude: 72.8777 });

  // 1. Navigate to Login
  await page.goto('/login');
  console.log('At login page.');

  // 2. Select Employee Login
  await page.click('button:has-text("Field Workforce Access")');
  await page.getByPlaceholder('Username or Email').fill('sameer@pyramidfm.com');
  await page.locator('input[type="password"]').fill('emp123');
  await page.click('button:has-text("Authorize Terminal Access")');

  // 3. Wait for Dashboard and go to Work Reports
  await page.waitForURL('**/employee/dashboard**', { timeout: 10000 });
  console.log('At Employee Dashboard.');
  
  // Navigate to Work Reports (Assuming it's in the nav or we go directly)
  await page.goto('/employee/reports'); // Try direct navigation if possible
  await page.waitForTimeout(2000);
  
  // 4. Click NEW REPORT
  const newReportBtn = page.locator('button:has-text("NEW REPORT")');
  await newReportBtn.waitFor({ state: 'visible' });
  await newReportBtn.click();
  console.log('Opened New Report modal.');

  // 5. Fill Form
  // Check if Photo box is visible
  const photoBox = page.locator('label[for="work-report-evidence-file"]');
  await expect(photoBox).toBeVisible();
  console.log('Photo box is visible.');

  // Upload Photo
  const photoInput = page.locator('input#work-report-evidence-file');
  const imagePath = 'C:\\Users\\jaiveer\\.gemini\\antigravity\\brain\\f60f5de1-6907-4bff-9d4a-8b4f1d950947\\test_evidence_photo_1775534711097.png';
  await photoInput.setInputFiles(imagePath);
  console.log('Photo uploaded.');

  // Type Remarks
  await page.getByPlaceholder('Describe the completed tasks').fill('Automated Test Report - ' + new Date().toISOString());
  
  // Verify Geofence if button exists
  const verifyBtn = page.locator('button:has-text("Verify")');
  if (await verifyBtn.isVisible()) {
      await verifyBtn.click();
      console.log('Clicked Verify button.');
      await page.waitForTimeout(1000);
  }

  // 6. SUBMIT
  const submitBtn = page.locator('button:has-text("UPLOAD EVIDENCE")');
  await expect(submitBtn).toBeEnabled();
  console.log('Submit button is enabled.');
  await submitBtn.click();
  console.log('Clicked Submit.');

  // 7. Wait for success
  await page.waitForSelector('text=Operations Report Transmitted Successfully', { timeout: 15000 });
  console.log('Success message confirmed!');

  await page.screenshot({ path: 'tests/report_submission_success.png' });
  console.log('Test completed successfully. Screenshot saved to tests/report_submission_success.png');
});
