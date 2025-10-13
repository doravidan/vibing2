import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCREENSHOTS_DIR = join(__dirname, 'playwright-screenshots-final');

// Create screenshots directory
mkdirSync(SCREENSHOTS_DIR, { recursive: true });
console.log(`✓ Screenshots directory: ${SCREENSHOTS_DIR}\n`);

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCreatePageFinal() {
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
    // STEP 1: Sign up
    console.log('📍 STEP 1: Creating test account...');
    await page.goto('http://localhost:3000/auth/signup', { waitUntil: 'domcontentloaded' });
    await wait(2000);

    const timestamp = Date.now();
    const testName = `Test User ${timestamp}`;
    const testUsername = `testuser${timestamp}`;
    const testPassword = 'SecurePass123!';

    console.log(`   Name: ${testName}`);
    console.log(`   Username: ${testUsername}`);

    // Fill signup form with all 3 fields (using id selectors)
    await page.locator('#name').fill(testName);
    await page.locator('#email').fill(testUsername);
    await page.locator('#password').fill(testPassword);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '01-signup-form-filled.png'),
      fullPage: true
    });

    await page.locator('button[type="submit"]:has-text("Sign Up")').click();
    console.log('   ✓ Sign up submitted');

    // Wait for redirect
    await wait(4000);

    // Navigate to create page
    console.log('\n📍 STEP 2: Navigating to /create page...');
    await page.goto('http://localhost:3000/create', { waitUntil: 'domcontentloaded' });
    await wait(3000);

    // Verify we're on create page
    if (!page.url().includes('/create')) {
      throw new Error(`❌ Not on create page! Current URL: ${page.url()}`);
    }

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '02-create-page-initial.png'),
      fullPage: true
    });
    console.log('   ✓ Create page loaded successfully\n');

    // STEP 3: First prompt - Blue header
    console.log('📍 STEP 3: First prompt (Blue header)...');

    const textarea = page.locator('textarea').first();
    await textarea.waitFor({ state: 'visible', timeout: 10000 });

    const prompt1 = 'Create a simple landing page with a blue header that says Welcome and a button that says Get Started';
    await textarea.fill(prompt1);
    console.log(`   Prompt: "${prompt1}"`);
    await wait(1000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '03-prompt1-entered.png'),
      fullPage: true
    });

    const generateBtn = page.locator('button:has-text("Generate")').first();
    await generateBtn.click();
    console.log('   ✓ Generation started');
    await wait(2000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '04-prompt1-generating.png'),
      fullPage: true
    });

    console.log('   ⏱️  Waiting 45 seconds for generation...');
    await wait(45000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '05-prompt1-complete.png'),
      fullPage: true
    });
    console.log('   ✓ First generation complete\n');

    // Screenshot preview panel
    const iframe = page.locator('iframe').first();
    if (await iframe.count() > 0) {
      await iframe.screenshot({
        path: join(SCREENSHOTS_DIR, '06-prompt1-preview-panel.png')
      });
      console.log('   ✓ Preview panel captured');
    }

    // STEP 4: Second prompt - Red header
    console.log('\n📍 STEP 4: Second prompt (Red header with subtitle)...');
    await wait(2000);

    const prompt2 = 'Change the header color to red and add a subtitle that says Discover Amazing Features';
    await textarea.fill(prompt2);
    console.log(`   Prompt: "${prompt2}"`);
    await wait(1000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '07-prompt2-entered.png'),
      fullPage: true
    });

    await generateBtn.click();
    console.log('   ✓ Generation started');
    await wait(2000);

    console.log('   ⏱️  Waiting 45 seconds for generation...');
    await wait(45000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '08-prompt2-complete.png'),
      fullPage: true
    });
    console.log('   ✓ Second generation complete\n');

    if (await iframe.count() > 0) {
      await iframe.screenshot({
        path: join(SCREENSHOTS_DIR, '09-prompt2-preview-panel.png')
      });
      console.log('   ✓ Preview panel captured');
    }

    // STEP 5: Third prompt - Contact form
    console.log('\n📍 STEP 5: Third prompt (Contact form)...');
    await wait(2000);

    const prompt3 = 'Add a contact form with name and email fields below the header';
    await textarea.fill(prompt3);
    console.log(`   Prompt: "${prompt3}"`);
    await wait(1000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '10-prompt3-entered.png'),
      fullPage: true
    });

    await generateBtn.click();
    console.log('   ✓ Generation started');
    await wait(2000);

    console.log('   ⏱️  Waiting 45 seconds for generation...');
    await wait(45000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '11-prompt3-complete.png'),
      fullPage: true
    });
    console.log('   ✓ Third generation complete\n');

    if (await iframe.count() > 0) {
      await iframe.screenshot({
        path: join(SCREENSHOTS_DIR, '12-prompt3-preview-panel.png')
      });
      console.log('   ✓ Preview panel captured');
    }

    // STEP 6: Verify UI elements
    console.log('\n📍 STEP 6: Verifying UI elements...');

    // Take final full screenshot
    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '13-final-state.png'),
      fullPage: true
    });

    // Look for monitoring stripe
    const monitoringLocators = [
      page.locator('text=/token/i').first(),
      page.locator('text=/context/i').first(),
      page.locator('text=/duration/i').first(),
      page.locator('[class*="metric"]').first(),
      page.locator('[class*="monitor"]').first()
    ];

    let monitoringFound = false;
    for (const locator of monitoringLocators) {
      if (await locator.count() > 0) {
        try {
          await locator.screenshot({
            path: join(SCREENSHOTS_DIR, '14-monitoring-stripe.png')
          });
          monitoringFound = true;
          console.log('   ✓ Monitoring stripe captured');
          break;
        } catch (e) {
          // Continue to next locator
        }
      }
    }
    if (!monitoringFound) {
      console.log('   ⚠️  Monitoring stripe not found');
    }

    // Look for chat messages
    const messages = await page.locator('[class*="message"]').all();
    console.log(`   ℹ️  Found ${messages.length} message elements`);

    // Look for version/history button
    const historyBtn = await page.locator('button:has-text("Version"), button:has-text("History")').all();
    console.log(`   ℹ️  Found ${historyBtn.length} history button(s)`);

    // Look for agent summary
    const summaryElements = await page.locator('text=/agent/i, text=/summary/i').all();
    console.log(`   ℹ️  Found ${summaryElements.length} summary-related elements`);

    // Screenshot the right side (preview panel)
    const rightPanel = page.locator('[class*="right"], [class*="preview"]').first();
    if (await rightPanel.count() > 0) {
      await rightPanel.screenshot({
        path: join(SCREENSHOTS_DIR, '15-right-preview-panel.png')
      });
      console.log('   ✓ Right panel captured');
    }

    // Screenshot the left side (chat)
    const leftPanel = page.locator('[class*="left"], [class*="chat"]').first();
    if (await leftPanel.count() > 0) {
      await leftPanel.screenshot({
        path: join(SCREENSHOTS_DIR, '16-left-chat-panel.png')
      });
      console.log('   ✓ Left panel captured');
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ TEST COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(80));
    console.log(`\n📁 All screenshots saved to:\n   ${SCREENSHOTS_DIR}\n`);

    console.log('📊 VERIFICATION SUMMARY:');
    console.log(`   • Three prompts submitted: ✓`);
    console.log(`   • Monitoring stripe: ${monitoringFound ? '✓' : '⚠️  Not found'}`);
    console.log(`   • Message elements: ${messages.length > 0 ? '✓' : '⚠️  Not found'}`);
    console.log(`   • History buttons: ${historyBtn.length > 0 ? '✓' : '⚠️  Not found'}`);
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
    console.log('\n⏱️  Keeping browser open for 10 seconds for inspection...');
    await wait(10000);
    await browser.close();
    console.log('Browser closed.\n');
  }
}

testCreatePageFinal().catch(err => {
  console.error('\n💥 FATAL ERROR:', err);
  process.exit(1);
});
