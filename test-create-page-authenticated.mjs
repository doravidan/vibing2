import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCREENSHOTS_DIR = join(__dirname, 'playwright-screenshots-authenticated');

// Create screenshots directory
try {
  mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  console.log(`✓ Screenshots directory created: ${SCREENSHOTS_DIR}`);
} catch (err) {
  console.log(`Screenshots directory exists: ${SCREENSHOTS_DIR}`);
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCreatePageAuthenticated() {
  console.log('🚀 Starting Playwright visual verification test with authentication...\n');

  // Set environment variable for browser path
  process.env.PLAYWRIGHT_BROWSERS_PATH = join(process.env.HOME, '.cache/ms-playwright');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    // Step 1: Sign up / Sign in
    console.log('📍 Step 1: Authenticating...');

    await page.goto('http://localhost:3000/auth/signup', { waitUntil: 'domcontentloaded' });
    await wait(2000);

    // Try to sign up with a test user
    const username = `testuser_${Date.now()}`;
    const password = 'testpass123';

    console.log(`Creating test user: ${username}`);

    const usernameInput = page.locator('input[name="username"], input[type="text"]').first();
    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
    const signUpButton = page.locator('button:has-text("Sign Up"), button[type="submit"]').first();

    await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
    await usernameInput.fill(username);
    await passwordInput.fill(password);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '00-signup-form-filled.png'),
      fullPage: true
    });

    await signUpButton.click();
    console.log('Clicked sign up button');
    await wait(3000);

    // Wait for redirect or navigation to create page
    await page.waitForURL(/\/(create|dashboard)/, { timeout: 10000 }).catch(() => {
      console.log('No redirect detected, manually navigating to /create');
    });

    // Navigate to create page
    console.log('📍 Step 2: Navigating to create page...');
    await page.goto('http://localhost:3000/create', { waitUntil: 'domcontentloaded' });
    await wait(3000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '01-create-page-loaded.png'),
      fullPage: true
    });
    console.log('✓ Create page loaded\n');

    // Step 3: Verify we're on the create page
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);

    if (!currentUrl.includes('/create')) {
      throw new Error('Not on create page! Authentication may have failed.');
    }

    // Step 4: First prompt workflow
    console.log('📍 Step 3: First prompt workflow (Blue header)...');

    // Wait for textarea
    const promptTextarea = page.locator('textarea').first();
    await promptTextarea.waitFor({ state: 'visible', timeout: 15000 });
    console.log('✓ Textarea found');

    // Type first prompt
    await promptTextarea.click();
    await wait(500);
    await promptTextarea.fill('Create a simple landing page with a blue header that says Welcome and a button that says Get Started');
    await wait(1000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '02-first-prompt-entered.png'),
      fullPage: true
    });
    console.log('✓ First prompt entered');

    // Click Generate button
    const generateButton = page.locator('button:has-text("Generate"), button:has-text("Submit"), button[type="submit"]').first();
    await generateButton.click();
    console.log('✓ Generate button clicked');
    await wait(3000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '03-first-generation-started.png'),
      fullPage: true
    });

    // Wait for generation (look for loading indicators)
    console.log('Waiting for first generation to complete (45 seconds)...');
    await wait(45000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '04-first-preview-complete.png'),
      fullPage: true
    });
    console.log('✓ First generation complete\n');

    // Try to screenshot the preview panel specifically
    const previewFrame = page.locator('iframe').first();
    if (await previewFrame.count() > 0) {
      await previewFrame.screenshot({
        path: join(SCREENSHOTS_DIR, '05-first-preview-iframe.png')
      });
      console.log('✓ Preview iframe captured');
    }

    // Step 5: Second prompt workflow
    console.log('📍 Step 4: Second prompt workflow (Red header)...');
    await wait(2000);

    await promptTextarea.click();
    await promptTextarea.fill('Change the header color to red and add a subtitle that says Discover Amazing Features');
    await wait(1000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '06-second-prompt-entered.png'),
      fullPage: true
    });
    console.log('✓ Second prompt entered');

    await generateButton.click();
    console.log('✓ Generate button clicked');
    await wait(3000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '07-second-generation-started.png'),
      fullPage: true
    });

    console.log('Waiting for second generation to complete (45 seconds)...');
    await wait(45000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '08-second-preview-complete.png'),
      fullPage: true
    });
    console.log('✓ Second generation complete\n');

    if (await previewFrame.count() > 0) {
      await previewFrame.screenshot({
        path: join(SCREENSHOTS_DIR, '09-second-preview-iframe.png')
      });
      console.log('✓ Preview iframe captured');
    }

    // Step 6: Third prompt workflow
    console.log('📍 Step 5: Third prompt workflow (Contact form)...');
    await wait(2000);

    await promptTextarea.click();
    await promptTextarea.fill('Add a contact form with name and email fields below the header');
    await wait(1000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '10-third-prompt-entered.png'),
      fullPage: true
    });
    console.log('✓ Third prompt entered');

    await generateButton.click();
    console.log('✓ Generate button clicked');
    await wait(3000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '11-third-generation-started.png'),
      fullPage: true
    });

    console.log('Waiting for third generation to complete (45 seconds)...');
    await wait(45000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '12-third-preview-complete.png'),
      fullPage: true
    });
    console.log('✓ Third generation complete\n');

    if (await previewFrame.count() > 0) {
      await previewFrame.screenshot({
        path: join(SCREENSHOTS_DIR, '13-third-preview-iframe.png')
      });
      console.log('✓ Preview iframe captured');
    }

    // Step 7: Verify UI elements
    console.log('📍 Step 6: Verifying UI elements...');

    // Check for monitoring stripe
    const monitoringElements = await page.locator('[class*="monitoring"], [class*="metrics"], [class*="token"], [class*="context"]').all();
    console.log(`Found ${monitoringElements.length} monitoring-related elements`);

    // Check for history button
    const historyButtons = await page.locator('button:has-text("history"), button:has-text("History"), button:has-text("Version")').all();
    console.log(`Found ${historyButtons.length} history-related buttons`);

    // Check for agent summary
    const summaryElements = await page.locator('[class*="summary"], [class*="agent"]').all();
    console.log(`Found ${summaryElements.length} summary-related elements`);

    // Final screenshot
    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '14-final-complete-state.png'),
      fullPage: true
    });
    console.log('✓ Final screenshot captured');

    // Screenshot chat area on the left
    const chatArea = page.locator('[class*="chat"], [class*="message"]').first();
    if (await chatArea.count() > 0) {
      await chatArea.screenshot({
        path: join(SCREENSHOTS_DIR, '15-chat-area.png')
      });
      console.log('✓ Chat area captured');
    }

    console.log('\n✅ Test completed successfully!');
    console.log(`📁 Screenshots saved to: ${SCREENSHOTS_DIR}`);
    console.log('\n📊 Summary:');
    console.log(`- Monitoring elements found: ${monitoringElements.length}`);
    console.log(`- History buttons found: ${historyButtons.length}`);
    console.log(`- Summary elements found: ${summaryElements.length}`);

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error.stack);

    // Take error screenshot
    try {
      await page.screenshot({
        path: join(SCREENSHOTS_DIR, 'ERROR-screenshot.png'),
        fullPage: true
      });
      console.log('Error screenshot saved');
    } catch (screenshotError) {
      console.error('Could not take error screenshot');
    }

    throw error;
  } finally {
    // Keep browser open for 10 seconds to inspect
    console.log('\nKeeping browser open for 10 seconds...');
    await wait(10000);
    await browser.close();
  }
}

// Run the test
testCreatePageAuthenticated().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
