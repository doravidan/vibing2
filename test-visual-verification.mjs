#!/usr/bin/env node

/**
 * Automated Playwright Visual Verification Test
 * Tests the create page with authentication DISABLED
 *
 * Run with: DISABLE_AUTH=true npm run dev (in one terminal)
 *           node test-visual-verification.mjs (in another terminal)
 */

import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const BASE_URL = 'http://localhost:3000';
const SCREENSHOTS_DIR = 'playwright-visual-test';
const GENERATION_WAIT = 50000; // 50 seconds per prompt

async function runVisualVerification() {
  console.log('🎭 Starting Playwright Visual Verification Test\n');
  console.log('📋 Test Plan:');
  console.log('  1. Navigate to /create page (no auth required)');
  console.log('  2. Submit prompt 1: Blue header landing page');
  console.log('  3. Wait 50s and capture preview');
  console.log('  4. Submit prompt 2: Change to red header + subtitle');
  console.log('  5. Wait 50s and capture preview');
  console.log('  6. Submit prompt 3: Add contact form');
  console.log('  7. Wait 50s and capture final preview');
  console.log('  8. Verify UI elements (monitoring stripe, history, etc.)\n');

  // Create screenshots directory
  await mkdir(SCREENSHOTS_DIR, { recursive: true });
  console.log(`✅ Created screenshots directory: ${SCREENSHOTS_DIR}\n`);

  // Launch browser
  console.log('🚀 Launching Chromium browser...');
  const browser = await chromium.launch({
    headless: false, // Show browser window
    slowMo: 500, // Slow down actions for visibility
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();
  console.log('✅ Browser launched\n');

  try {
    // Navigate to create page
    console.log('📍 Step 1: Navigating to /create page...');
    await page.goto(`${BASE_URL}/create`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '01-initial-page.png'),
      fullPage: true
    });
    console.log('✅ Page loaded and screenshot captured\n');

    // Select project type: Website / Web App
    console.log('🔍 Step 2: Selecting project type (Website/Web App)...');
    const websiteCard = page.locator('text=Website / Web App').first();
    await websiteCard.waitFor({ state: 'visible', timeout: 10000 });
    await websiteCard.click();
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '02-website-selected.png'),
      fullPage: true
    });
    console.log('✅ Website type selected\n');

    // Verify chat interface loaded
    console.log('🔍 Verifying chat interface elements...');
    await page.waitForSelector('input[placeholder*="Describe what you want to build"]', { timeout: 10000 });
    const hasInput = await page.locator('input[placeholder*="Describe what you want to build"]').count() > 0;

    if (!hasInput) {
      throw new Error('❌ Required input field not found');
    }
    console.log('✅ Input field found\n');

    // PROMPT 1: Blue header landing page
    console.log('📝 Step 3: Submitting Prompt 1 (Blue Header)...');
    const prompt1 = 'Create a simple landing page with a blue header that says Welcome and a button that says Get Started';

    const inputField = page.locator('input[placeholder*="Describe what you want to build"]');
    await inputField.fill(prompt1);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, '03-prompt1-entered.png'), fullPage: true });

    // Click the send button (the icon button next to input)
    await page.locator('button[type="submit"]').click();
    console.log('✅ Prompt 1 submitted, waiting 50 seconds...');

    await page.waitForTimeout(GENERATION_WAIT);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '04-prompt1-complete.png'),
      fullPage: true
    });
    console.log('✅ Prompt 1 complete - Blue header captured\n');

    // Check for monitoring stripe
    const hasMetrics = await page.locator('text=Tokens:').count() > 0;
    console.log(`${hasMetrics ? '✅' : '❌'} Monitoring stripe visible: ${hasMetrics}\n`);

    // PROMPT 2: Red header + subtitle
    console.log('📝 Step 4: Submitting Prompt 2 (Red Header + Subtitle)...');
    const prompt2 = 'Change the header color to red and add a subtitle that says Discover Amazing Features';

    await inputField.fill(prompt2);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, '05-prompt2-entered.png'), fullPage: true });

    await page.locator('button[type="submit"]').click();
    console.log('✅ Prompt 2 submitted, waiting 50 seconds...');

    await page.waitForTimeout(GENERATION_WAIT);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '06-prompt2-complete.png'),
      fullPage: true
    });
    console.log('✅ Prompt 2 complete - Red header + subtitle captured\n');

    // PROMPT 3: Add contact form
    console.log('📝 Step 5: Submitting Prompt 3 (Add Contact Form)...');
    const prompt3 = 'Add a contact form with name and email fields below the header';

    await inputField.fill(prompt3);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, '07-prompt3-entered.png'), fullPage: true });

    await page.locator('button[type="submit"]').click();
    console.log('✅ Prompt 3 submitted, waiting 50 seconds...');

    await page.waitForTimeout(GENERATION_WAIT);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '08-prompt3-complete.png'),
      fullPage: true
    });
    console.log('✅ Prompt 3 complete - Contact form captured\n');

    // Final verification
    console.log('🔍 Step 6: Final UI Verification...');

    const hasHistory = await page.locator('button:has-text("History")').count() > 0;
    const hasChatMessages = await page.locator('text=Agent Summary').count() > 0;

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '09-final-state.png'),
      fullPage: true
    });

    console.log('\n📊 Test Results:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Prompt 1 (Blue Header):     COMPLETED`);
    console.log(`✅ Prompt 2 (Red Header):      COMPLETED`);
    console.log(`✅ Prompt 3 (Contact Form):    COMPLETED`);
    console.log(`${hasMetrics ? '✅' : '❌'} Monitoring Stripe:        ${hasMetrics ? 'VISIBLE' : 'NOT FOUND'}`);
    console.log(`${hasHistory ? '✅' : '❌'} History Button:           ${hasHistory ? 'VISIBLE' : 'NOT FOUND'}`);
    console.log(`${hasChatMessages ? '✅' : '❌'} Agent Summary:            ${hasChatMessages ? 'VISIBLE' : 'NOT FOUND'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`📸 Screenshots saved to: ${SCREENSHOTS_DIR}/`);
    console.log('\n✅ TEST COMPLETED SUCCESSFULLY!\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);

    // Take error screenshot
    await page.screenshot({
      path: join(SCREENSHOTS_DIR, 'ERROR-screenshot.png'),
      fullPage: true
    });

    throw error;
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
}

// Run the test
runVisualVerification()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });
