#!/usr/bin/env node

/**
 * Test AWS authentication flow
 * Tests signup, signin, and session management
 */

import { chromium } from 'playwright';

const AWS_URL = 'http://54.197.9.144:3000';

async function testAuthFlow() {
  console.log('🚀 Testing AWS authentication flow...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Test 1: Homepage loads
    console.log('✓ Step 1: Loading homepage...');
    await page.goto(AWS_URL);
    await page.waitForLoadState('networkidle');
    console.log('  ✅ Homepage loaded successfully\n');

    // Test 2: Navigate to signup
    console.log('✓ Step 2: Navigating to signup page...');
    await page.goto(`${AWS_URL}/auth/signup`);
    await page.waitForLoadState('networkidle');
    console.log('  ✅ Signup page loaded\n');

    // Test 3: Try to signup with existing user (should fail)
    console.log('✓ Step 3: Testing signup with existing user...');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpass123');
    await page.fill('input[name="name"]', 'Test User');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    const signupError = await page.textContent('text=Email already exists').catch(() => null);
    if (signupError) {
      console.log('  ✅ Correctly detected existing user\n');
    } else {
      console.log('  ⚠️  No error message shown (might be a new user)\n');
    }

    // Test 4: Navigate to signin
    console.log('✓ Step 4: Navigating to signin page...');
    await page.goto(`${AWS_URL}/auth/signin`);
    await page.waitForLoadState('networkidle');
    console.log('  ✅ Signin page loaded\n');

    // Test 5: Sign in with existing user
    console.log('✓ Step 5: Testing signin with credentials...');
    await page.fill('input[type="text"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpass123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Check if redirected to dashboard
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard')) {
      console.log('  ✅ Successfully signed in and redirected to dashboard\n');
    } else if (currentUrl.includes('/signin')) {
      const error = await page.textContent('text=Invalid username or password').catch(() => null);
      if (error) {
        console.log('  ❌ Sign in failed: Invalid credentials\n');
      } else {
        console.log(`  ⚠️  Still on signin page: ${currentUrl}\n`);
      }
    } else {
      console.log(`  ℹ️  Redirected to: ${currentUrl}\n`);
    }

    // Test 6: Check session
    console.log('✓ Step 6: Checking session...');
    const sessionResponse = await page.goto(`${AWS_URL}/api/auth/session`);
    const sessionData = await sessionResponse.json();

    if (sessionData && sessionData.user) {
      console.log('  ✅ Session active:', sessionData.user.email);
      console.log('  ✅ User ID:', sessionData.user.id);
    } else {
      console.log('  ⚠️  No active session');
    }

    console.log('\n✅ Authentication tests completed!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

testAuthFlow();
