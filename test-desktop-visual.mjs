import { chromium } from 'playwright';

async function verifyDesktopApp() {
  console.log('🔍 Starting visual verification of Desktop App...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  const page = await context.newPage();

  try {
    console.log('📡 Navigating to http://localhost:8080...');
    await page.goto('http://localhost:8080', {
      waitUntil: 'networkidle',
      timeout: 10000
    });

    // Wait a bit for any JavaScript to execute
    await page.waitForTimeout(1000);

    // Get page title
    const title = await page.title();
    console.log(`📄 Page Title: "${title}"`);

    // Get the main heading
    const h1Text = await page.locator('h1').first().textContent().catch(() => 'Not found');
    console.log(`📌 Main Heading (h1): "${h1Text}"`);

    // Get the subtitle/description
    const pText = await page.locator('p').first().textContent().catch(() => 'Not found');
    console.log(`📝 First Paragraph: "${pText}"`);

    // Check for status element
    const statusText = await page.locator('.status').textContent().catch(() => 'Status not found');
    console.log(`📊 Status Indicator: "${statusText}"`);

    // Check if Tauri API is mentioned in console
    const consoleLogs = [];
    page.on('console', msg => consoleLogs.push(msg.text()));

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    console.log('\n📋 Console Logs:');
    consoleLogs.forEach(log => console.log(`   ${log}`));

    // Get full body text
    const bodyText = await page.locator('body').textContent();
    console.log(`\n📄 Full Body Content (first 500 chars):\n${bodyText.substring(0, 500)}...`);

    // Take screenshot
    const screenshotPath = '/Users/I347316/dev/vibing2/desktop-app-visual-check.png';
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });
    console.log(`\n📸 Screenshot saved to: ${screenshotPath}`);

    // Check if it looks like the correct landing page
    const hasCorrectTitle = title.includes('Vibing2');
    const hasCorrectHeading = h1Text.includes('Vibing2');
    const hasStatus = statusText.length > 0;

    console.log('\n✅ Verification Results:');
    console.log(`   Title contains "Vibing2": ${hasCorrectTitle}`);
    console.log(`   Heading contains "Vibing2": ${hasCorrectHeading}`);
    console.log(`   Has status indicator: ${hasStatus}`);

    if (hasCorrectTitle && hasCorrectHeading) {
      console.log('\n✅ SUCCESS: Desktop app is showing the correct landing page!');
    } else {
      console.log('\n❌ WARNING: Desktop app might not be showing the expected content!');
    }

  } catch (error) {
    console.error('\n❌ Error during verification:', error.message);
  } finally {
    await browser.close();
  }
}

verifyDesktopApp();
