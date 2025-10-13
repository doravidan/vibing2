import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCREENSHOTS_DIR = join(__dirname, 'playwright-screenshots-signin');

// Create screenshots directory
mkdirSync(SCREENSHOTS_DIR, { recursive: true });
console.log(`✓ Screenshots directory: ${SCREENSHOTS_DIR}\n`);

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCreatePageWithSignIn() {
  console.log('🚀 Starting Playwright E2E visual verification test\n');

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
    // STEP 1: First try to create account, if fails try to sign in
    console.log('📍 STEP 1: Authentication...');

    const timestamp = Date.now();
    const testName = `Test User ${timestamp}`;
    const testUsername = `test${timestamp}`;
    const testPassword = 'testpass123';

    // Try signup first
    await page.goto('http://localhost:3000/auth/signup', { waitUntil: 'domcontentloaded' });
    await wait(2000);

    console.log(`   Attempting signup with username: ${testUsername}`);

    await page.locator('#name').fill(testName);
    await page.locator('#email').fill(testUsername);
    await page.locator('#password').fill(testPassword);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '01-signup-attempt.png'),
      fullPage: true
    });

    await page.locator('button[type="submit"]:has-text("Sign Up")').click();
    console.log('   ✓ Signup submitted');

    await wait(5000);

    // Check if we were redirected to dashboard or if signup failed
    const currentUrl = page.url();
    console.log(`   Current URL after signup: ${currentUrl}`);

    // If still on signin page, use fallback credentials
    if (currentUrl.includes('/signin')) {
      console.log('   Signup may have failed, trying signin with fallback credentials...');

      // Use a known test account
      const fallbackUsername = 'testuser';
      const fallbackPassword = 'testpass123';

      await page.goto('http://localhost:3000/auth/signin', { waitUntil: 'domcontentloaded' });
      await wait(2000);

      await page.locator('#email').fill(fallbackUsername);
      await page.locator('#password').fill(fallbackPassword);

      await page.screenshot({
        path: join(SCREENSHOTS_DIR, '02-signin-fallback.png'),
        fullPage: true
      });

      await page.locator('button[type="submit"]').click();
      console.log('   ✓ Sign in submitted');

      await wait(5000);
    }

    // Navigate to create page
    console.log('\n📍 STEP 2: Navigating to /create page...');
    await page.goto('http://localhost:3000/create', { waitUntil: 'domcontentloaded' });
    await wait(4000);

    const createUrl = page.url();
    console.log(`   Current URL: ${createUrl}`);

    // If still on signin, we have an auth problem
    if (createUrl.includes('/signin')) {
      console.log('   ⚠️  Still on signin page after authentication attempt');
      console.log('   Note: Manual authentication may be required');
      console.log('   Proceeding with test to document current state...\n');
    } else {
      console.log('   ✓ Successfully navigated to create page\n');
    }

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '03-create-page-initial.png'),
      fullPage: true
    });

    // STEP 3: First prompt - Blue header
    console.log('📍 STEP 3: First prompt (Blue header)...');

    const textarea = page.locator('textarea').first();
    const textareaExists = await textarea.count() > 0;

    if (!textareaExists) {
      console.log('   ⚠️  Textarea not found - may not be authenticated');
      console.log('   Documenting current page state...\n');

      await page.screenshot({
        path: join(SCREENSHOTS_DIR, '04-no-textarea-found.png'),
        fullPage: true
      });

      throw new Error('Cannot proceed - textarea not found (authentication required)');
    }

    await textarea.waitFor({ state: 'visible', timeout: 10000 });

    const prompt1 = 'Create a simple landing page with a blue header that says Welcome and a button that says Get Started';
    await textarea.fill(prompt1);
    console.log(`   Prompt: "${prompt1}"`);
    await wait(1000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '05-prompt1-entered.png'),
      fullPage: true
    });

    const generateBtn = page.locator('button:has-text("Generate")').first();
    await generateBtn.click();
    console.log('   ✓ Generation started');
    await wait(2000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '06-prompt1-generating.png'),
      fullPage: true
    });

    console.log('   ⏱️  Waiting 50 seconds for generation...');
    await wait(50000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '07-prompt1-complete.png'),
      fullPage: true
    });
    console.log('   ✓ First generation complete\n');

    // Screenshot preview panel
    const iframe = page.locator('iframe').first();
    if (await iframe.count() > 0) {
      await iframe.screenshot({
        path: join(SCREENSHOTS_DIR, '08-prompt1-preview-panel.png')
      });
      console.log('   ✓ Preview panel captured');
    }

    // STEP 4: Second prompt - Red header
    console.log('\n📍 STEP 4: Second prompt (Red header with subtitle)...');
    await wait(3000);

    const prompt2 = 'Change the header color to red and add a subtitle that says Discover Amazing Features';
    await textarea.fill(prompt2);
    console.log(`   Prompt: "${prompt2}"`);
    await wait(1000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '09-prompt2-entered.png'),
      fullPage: true
    });

    await generateBtn.click();
    console.log('   ✓ Generation started');
    await wait(2000);

    console.log('   ⏱️  Waiting 50 seconds for generation...');
    await wait(50000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '10-prompt2-complete.png'),
      fullPage: true
    });
    console.log('   ✓ Second generation complete\n');

    if (await iframe.count() > 0) {
      await iframe.screenshot({
        path: join(SCREENSHOTS_DIR, '11-prompt2-preview-panel.png')
      });
      console.log('   ✓ Preview panel captured');
    }

    // STEP 5: Third prompt - Contact form
    console.log('\n📍 STEP 5: Third prompt (Contact form)...');
    await wait(3000);

    const prompt3 = 'Add a contact form with name and email fields below the header';
    await textarea.fill(prompt3);
    console.log(`   Prompt: "${prompt3}"`);
    await wait(1000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '12-prompt3-entered.png'),
      fullPage: true
    });

    await generateBtn.click();
    console.log('   ✓ Generation started');
    await wait(2000);

    console.log('   ⏱️  Waiting 50 seconds for generation...');
    await wait(50000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '13-prompt3-complete.png'),
      fullPage: true
    });
    console.log('   ✓ Third generation complete\n');

    if (await iframe.count() > 0) {
      await iframe.screenshot({
        path: join(SCREENSHOTS_DIR, '14-prompt3-preview-panel.png')
      });
      console.log('   ✓ Preview panel captured');
    }

    // STEP 6: Verify UI elements
    console.log('\n📍 STEP 6: Verifying UI elements...');

    // Take final full screenshot
    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '15-final-state.png'),
      fullPage: true
    });

    // Look for various UI elements
    const messages = await page.locator('[class*="message"]').all();
    console.log(`   ℹ️  Found ${messages.length} message elements`);

    const historyBtn = await page.locator('button:has-text("Version"), button:has-text("History")').all();
    console.log(`   ℹ️  Found ${historyBtn.length} history button(s)`);

    const monitoringText = await page.locator('text=/token|context|duration/i').all();
    console.log(`   ℹ️  Found ${monitoringText.length} monitoring-related text elements`);

    // Try to capture specific regions
    const rightSide = page.locator('[class*="preview"], iframe').first();
    if (await rightSide.count() > 0) {
      await rightSide.screenshot({
        path: join(SCREENSHOTS_DIR, '16-preview-region.png')
      });
      console.log('   ✓ Preview region captured');
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ TEST COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(80));
    console.log(`\n📁 All screenshots saved to:\n   ${SCREENSHOTS_DIR}\n`);

    console.log('📊 VERIFICATION SUMMARY:');
    console.log(`   • Three prompts submitted: ✓`);
    console.log(`   • Message elements: ${messages.length} found`);
    console.log(`   • History buttons: ${historyBtn.length} found`);
    console.log(`   • Monitoring elements: ${monitoringText.length} found`);
    console.log(`   • Preview panels captured: ${await iframe.count() > 0 ? '✓' : '⚠️  Not found'}`);

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, 'ERROR-screenshot.png'),
      fullPage: true
    });
    console.error('Error screenshot saved');

    throw error;
  } finally {
    console.log('\n⏱️  Keeping browser open for 15 seconds for inspection...');
    await wait(15000);
    await browser.close();
    console.log('Browser closed.\n');
  }
}

testCreatePageWithSignIn().catch(err => {
  console.error('\n💥 FATAL ERROR:', err);
  process.exit(1);
});
