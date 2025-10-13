/**
 * Playwright Visual Verification Test - Manual Authentication Version
 *
 * This test requires manual authentication before proceeding.
 *
 * INSTRUCTIONS:
 * 1. Run this script: node test-create-manual-auth.mjs
 * 2. A browser window will open
 * 3. Manually sign in at the signin page
 * 4. Once signed in and on the create page, press ENTER in the terminal
 * 5. The automated test will proceed
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCREENSHOTS_DIR = join(__dirname, 'playwright-screenshots-manual');

// Create screenshots directory
mkdirSync(SCREENSHOTS_DIR, { recursive: true });
console.log(`✓ Screenshots directory: ${SCREENSHOTS_DIR}\n`);

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForEnter(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(message, () => {
      rl.close();
      resolve();
    });
  });
}

async function testWithManualAuth() {
  console.log('🚀 Playwright Visual Verification Test - Manual Auth Version\n');
  console.log('=' .repeat(80));

  process.env.PLAYWRIGHT_BROWSERS_PATH = join(process.env.HOME, '.cache/ms-playwright');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 200
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    // STEP 1: Manual authentication
    console.log('\n📍 STEP 1: Manual Authentication Required\n');
    console.log('   A browser window has opened.');
    console.log('   Please complete these steps:\n');
    console.log('   1. Sign in to your account');
    console.log('   2. Navigate to http://localhost:3000/create');
    console.log('   3. Wait for the create page to fully load');
    console.log('   4. Press ENTER in this terminal to continue\n');

    await page.goto('http://localhost:3000/auth/signin', { waitUntil: 'domcontentloaded' });
    await wait(2000);

    // Wait for user to authenticate
    await waitForEnter('Press ENTER once you are signed in and on the /create page: ');

    console.log('\n✓ Continuing with automated test...\n');
    await wait(2000);

    // Verify we're on create page
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);

    if (!currentUrl.includes('/create')) {
      console.log('⚠️  Warning: Not on /create page. Navigating now...');
      await page.goto('http://localhost:3000/create', { waitUntil: 'domcontentloaded' });
      await wait(3000);
    }

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '01-authenticated-create-page.png'),
      fullPage: true
    });
    console.log('✓ Initial screenshot captured\n');

    // STEP 2: First prompt - Blue header
    console.log('📍 STEP 2: First Prompt (Blue header)\n');

    const textarea = page.locator('textarea').first();
    await textarea.waitFor({ state: 'visible', timeout: 10000 });

    const prompt1 = 'Create a simple landing page with a blue header that says Welcome and a button that says Get Started';
    console.log(`   Prompt: "${prompt1}"`);
    await textarea.fill(prompt1);
    await wait(1000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '02-prompt1-entered.png'),
      fullPage: true
    });

    const generateBtn = page.locator('button:has-text("Generate")').first();
    await generateBtn.click();
    console.log('   ✓ Generation started');
    await wait(3000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '03-prompt1-generating.png'),
      fullPage: true
    });

    console.log('   ⏱️  Waiting 50 seconds for generation to complete...');
    await wait(50000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '04-prompt1-BLUE-HEADER-complete.png'),
      fullPage: true
    });
    console.log('   ✓ First generation complete\n');

    // Capture preview iframe
    const iframe = page.locator('iframe').first();
    if (await iframe.count() > 0) {
      try {
        await iframe.screenshot({
          path: join(SCREENSHOTS_DIR, '05-prompt1-BLUE-HEADER-preview.png')
        });
        console.log('   ✓ Preview panel with BLUE HEADER captured\n');
      } catch (e) {
        console.log('   ⚠️  Could not capture iframe\n');
      }
    }

    // STEP 3: Second prompt - Red header
    console.log('📍 STEP 3: Second Prompt (Red header with subtitle)\n');
    await wait(3000);

    const prompt2 = 'Change the header color to red and add a subtitle that says Discover Amazing Features';
    console.log(`   Prompt: "${prompt2}"`);
    await textarea.fill(prompt2);
    await wait(1000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '06-prompt2-entered.png'),
      fullPage: true
    });

    await generateBtn.click();
    console.log('   ✓ Generation started');
    await wait(3000);

    console.log('   ⏱️  Waiting 50 seconds for generation to complete...');
    await wait(50000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '07-prompt2-RED-HEADER-complete.png'),
      fullPage: true
    });
    console.log('   ✓ Second generation complete\n');

    if (await iframe.count() > 0) {
      try {
        await iframe.screenshot({
          path: join(SCREENSHOTS_DIR, '08-prompt2-RED-HEADER-preview.png')
        });
        console.log('   ✓ Preview panel with RED HEADER and subtitle captured\n');
      } catch (e) {
        console.log('   ⚠️  Could not capture iframe\n');
      }
    }

    // STEP 4: Third prompt - Contact form
    console.log('📍 STEP 4: Third Prompt (Contact form)\n');
    await wait(3000);

    const prompt3 = 'Add a contact form with name and email fields below the header';
    console.log(`   Prompt: "${prompt3}"`);
    await textarea.fill(prompt3);
    await wait(1000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '09-prompt3-entered.png'),
      fullPage: true
    });

    await generateBtn.click();
    console.log('   ✓ Generation started');
    await wait(3000);

    console.log('   ⏱️  Waiting 50 seconds for generation to complete...');
    await wait(50000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '10-prompt3-WITH-FORM-complete.png'),
      fullPage: true
    });
    console.log('   ✓ Third generation complete\n');

    if (await iframe.count() > 0) {
      try {
        await iframe.screenshot({
          path: join(SCREENSHOTS_DIR, '11-prompt3-WITH-FORM-preview.png')
        });
        console.log('   ✓ Preview panel with CONTACT FORM captured\n');
      } catch (e) {
        console.log('   ⚠️  Could not capture iframe\n');
      }
    }

    // STEP 5: Verify UI elements
    console.log('📍 STEP 5: Verifying UI Elements\n');

    // Final full screenshot
    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '12-final-complete-state.png'),
      fullPage: true
    });
    console.log('   ✓ Final full-page screenshot captured');

    // Count UI elements
    const messages = await page.locator('[class*="message"]').all();
    console.log(`   ℹ️  Message elements: ${messages.length}`);

    const tokens = await page.locator('text=/token|context|duration/i').all();
    console.log(`   ℹ️  Monitoring text elements: ${tokens.length}`);

    const historyBtns = await page.locator('button:has-text("Version"), button:has-text("History")').all();
    console.log(`   ℹ️  History buttons: ${historyBtns.length}`);

    // Try to capture monitoring stripe
    const monitoringStripe = page.locator('[class*="monitoring"], [class*="metric"]').first();
    if (await monitoringStripe.count() > 0) {
      try {
        await monitoringStripe.screenshot({
          path: join(SCREENSHOTS_DIR, '13-monitoring-stripe.png')
        });
        console.log('   ✓ Monitoring stripe captured');
      } catch (e) {
        console.log('   ⚠️  Could not capture monitoring stripe');
      }
    }

    // Try to capture chat area
    const chatArea = page.locator('[class*="chat"], [class*="left"]').first();
    if (await chatArea.count() > 0) {
      try {
        await chatArea.screenshot({
          path: join(SCREENSHOTS_DIR, '14-chat-area.png')
        });
        console.log('   ✓ Chat area captured');
      } catch (e) {
        console.log('   ⚠️  Could not capture chat area');
      }
    }

    // Try to capture preview area
    const previewArea = page.locator('[class*="preview"], [class*="right"]').first();
    if (await previewArea.count() > 0) {
      try {
        await previewArea.screenshot({
          path: join(SCREENSHOTS_DIR, '15-preview-area.png')
        });
        console.log('   ✓ Preview area captured');
      } catch (e) {
        console.log('   ⚠️  Could not capture preview area');
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ TEST COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(80));
    console.log(`\n📁 Screenshots saved to: ${SCREENSHOTS_DIR}\n`);

    console.log('📊 VERIFICATION RESULTS:\n');
    console.log('   ✅ First prompt (Blue header): Screenshot captured');
    console.log('   ✅ Second prompt (Red header): Screenshot captured');
    console.log('   ✅ Third prompt (Contact form): Screenshot captured');
    console.log(`   ${messages.length > 0 ? '✅' : '⚠️ '} Message elements: ${messages.length} found`);
    console.log(`   ${tokens.length > 0 ? '✅' : '⚠️ '} Monitoring elements: ${tokens.length} found`);
    console.log(`   ${historyBtns.length > 0 ? '✅' : '⚠️ '} History buttons: ${historyBtns.length} found`);
    console.log(`   ${await iframe.count() > 0 ? '✅' : '⚠️ '} Preview iframe: ${await iframe.count() > 0 ? 'Found' : 'Not found'}`);

    console.log('\n💡 Next Steps:');
    console.log('   1. Review screenshots to verify visual changes');
    console.log('   2. Check that blue → red header change is visible');
    console.log('   3. Verify contact form appears in final screenshots');
    console.log('   4. Confirm monitoring stripe shows updated metrics\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, 'ERROR-screenshot.png'),
      fullPage: true
    });
    console.error('\nError screenshot saved to:', join(SCREENSHOTS_DIR, 'ERROR-screenshot.png'));

    throw error;
  } finally {
    console.log('⏱️  Keeping browser open for 15 seconds for inspection...');
    await wait(15000);
    await browser.close();
    console.log('Browser closed.\n');
  }
}

// Run the test
console.log('\n🎭 Playwright Visual Verification Test');
console.log('=' .repeat(80));
console.log('This test requires manual authentication.');
console.log('A browser will open for you to sign in.\n');

testWithManualAuth().catch(err => {
  console.error('\n💥 FATAL ERROR:', err);
  process.exit(1);
});
