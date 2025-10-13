import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCREENSHOTS_DIR = join(__dirname, 'playwright-screenshots');

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

async function waitForNetworkIdle(page, timeout = 60000) {
  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch (err) {
    console.log('Network idle timeout, continuing...');
  }
}

async function testCreatePage() {
  console.log('🚀 Starting Playwright visual verification test...\n');

  // Set environment variable for browser path
  process.env.PLAYWRIGHT_BROWSERS_PATH = join(process.env.HOME, '.cache/ms-playwright');

  const browser = await chromium.launch({
    headless: false,  // Run in visible mode so we can see what's happening
    slowMo: 500 // Slow down actions for visibility
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    // Step 1: Navigate to create page
    console.log('📍 Step 1: Navigating to create page...');
    await page.goto('http://localhost:3000/create', { waitUntil: 'domcontentloaded' });
    await wait(3000);

    // Take initial screenshot
    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '01-initial-page-load.png'),
      fullPage: true
    });
    console.log('✓ Initial screenshot captured\n');

    // Step 2: Check page layout
    console.log('📍 Step 2: Verifying page layout...');

    // Wait for main elements to be visible
    const promptTextarea = await page.locator('textarea, input[type="text"]').first();
    await promptTextarea.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✓ Prompt input found');

    // Take screenshot of full layout
    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '02-page-layout.png'),
      fullPage: true
    });
    console.log('✓ Layout screenshot captured\n');

    // Step 3: First prompt - Blue header
    console.log('📍 Step 3: First prompt workflow (Blue header)...');

    // Check for project type selector
    const websiteButton = page.locator('button:has-text("website"), button:has-text("Website")').first();
    const websiteExists = await websiteButton.count() > 0;

    if (websiteExists) {
      console.log('Found website button, clicking...');
      await websiteButton.click();
      await wait(1000);
    } else {
      console.log('No website button found, continuing...');
    }

    // Type first prompt
    console.log('Typing first prompt...');
    await promptTextarea.click();
    await promptTextarea.fill('Create a simple landing page with a blue header that says Welcome and a button that says Get Started');
    await wait(1000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '03-first-prompt-entered.png'),
      fullPage: true
    });
    console.log('✓ First prompt entered');

    // Find and click Generate button
    const generateButton = page.locator('button:has-text("Generate"), button:has-text("Submit"), button[type="submit"]').first();
    await generateButton.waitFor({ state: 'visible', timeout: 5000 });
    console.log('Clicking Generate button...');
    await generateButton.click();
    await wait(2000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '04-first-generation-started.png'),
      fullPage: true
    });
    console.log('✓ Generation started');

    // Wait for generation to complete (look for loading indicators)
    console.log('Waiting for first generation to complete (45 seconds)...');
    await wait(45000);

    // Take screenshot of preview with blue header
    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '05-first-preview-blue-header.png'),
      fullPage: true
    });
    console.log('✓ First preview screenshot captured');

    // Screenshot of monitoring stripe
    const monitoringStripe = page.locator('[class*="monitoring"], [class*="metrics"], [class*="stats"]').first();
    if (await monitoringStripe.count() > 0) {
      await monitoringStripe.screenshot({
        path: join(SCREENSHOTS_DIR, '06-first-monitoring-stripe.png')
      });
      console.log('✓ Monitoring stripe screenshot captured\n');
    } else {
      console.log('⚠ Monitoring stripe not found\n');
    }

    // Step 4: Second prompt - Red header
    console.log('📍 Step 4: Second prompt workflow (Red header with subtitle)...');
    await wait(2000);

    // Clear and type second prompt
    await promptTextarea.click();
    await promptTextarea.fill('Change the header color to red and add a subtitle that says Discover Amazing Features');
    await wait(1000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '07-second-prompt-entered.png'),
      fullPage: true
    });
    console.log('✓ Second prompt entered');

    // Click Generate
    await generateButton.click();
    await wait(2000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '08-second-generation-started.png'),
      fullPage: true
    });
    console.log('✓ Second generation started');

    // Wait for completion
    console.log('Waiting for second generation to complete (45 seconds)...');
    await wait(45000);

    // Screenshot of preview with red header
    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '09-second-preview-red-header.png'),
      fullPage: true
    });
    console.log('✓ Second preview screenshot captured');

    // Screenshot updated monitoring stripe
    if (await monitoringStripe.count() > 0) {
      await monitoringStripe.screenshot({
        path: join(SCREENSHOTS_DIR, '10-second-monitoring-stripe.png')
      });
      console.log('✓ Updated monitoring stripe screenshot captured\n');
    }

    // Step 5: Third prompt - Contact form
    console.log('📍 Step 5: Third prompt workflow (Contact form)...');
    await wait(2000);

    // Type third prompt
    await promptTextarea.click();
    await promptTextarea.fill('Add a contact form with name and email fields below the header');
    await wait(1000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '11-third-prompt-entered.png'),
      fullPage: true
    });
    console.log('✓ Third prompt entered');

    // Click Generate
    await generateButton.click();
    await wait(2000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '12-third-generation-started.png'),
      fullPage: true
    });
    console.log('✓ Third generation started');

    // Wait for completion
    console.log('Waiting for third generation to complete (45 seconds)...');
    await wait(45000);

    // Screenshot of preview with form
    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '13-third-preview-with-form.png'),
      fullPage: true
    });
    console.log('✓ Third preview screenshot captured\n');

    // Step 6: Verify UI elements
    console.log('📍 Step 6: Verifying all UI elements...');

    // Check for version history button
    const historyButton = page.locator('button:has-text("history"), button:has-text("History"), button:has-text("Version")').first();
    if (await historyButton.count() > 0) {
      await historyButton.screenshot({
        path: join(SCREENSHOTS_DIR, '14-version-history-button.png')
      });
      console.log('✓ Version history button found');
    } else {
      console.log('⚠ Version history button not found');
    }

    // Check for agent summary
    const agentSummary = page.locator('[class*="summary"], [class*="agent"]').first();
    if (await agentSummary.count() > 0) {
      await agentSummary.screenshot({
        path: join(SCREENSHOTS_DIR, '15-agent-summary.png')
      });
      console.log('✓ Agent summary found');
    } else {
      console.log('⚠ Agent summary not found');
    }

    // Final full page screenshot
    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '16-final-complete-state.png'),
      fullPage: true
    });
    console.log('✓ Final screenshot captured');

    // Try to screenshot just the preview panel
    const previewPanel = page.locator('iframe, [class*="preview"]').first();
    if (await previewPanel.count() > 0) {
      await previewPanel.screenshot({
        path: join(SCREENSHOTS_DIR, '17-preview-panel-close-up.png')
      });
      console.log('✓ Preview panel close-up captured');
    }

    console.log('\n✅ Test completed successfully!');
    console.log(`📁 Screenshots saved to: ${SCREENSHOTS_DIR}`);

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);

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
    await browser.close();
  }
}

// Run the test
testCreatePage().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
