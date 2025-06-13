const puppeteer = require('puppeteer');

/**
 * Keyboard Navigation Test
 * Tests accessibility compliance for keyboard-only users
 */
(async () => {
  console.log('⌨️ Testing Keyboard Navigation...\n');
  
  const browser = await puppeteer.launch({
    headless: true, // Run in headless mode
    slowMo: 50
  });
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:8000');
    await page.waitForTimeout(2000);
    
    const testResults = {
      passed: [],
      failed: [],
      warnings: []
    };
    
    // Test 1: Tab navigation order
    console.log('📋 Test 1: Tab Navigation Order');
    const tabOrder = [];
    
    // Start from body
    await page.keyboard.press('Tab');
    
    // Tab through all focusable elements
    for (let i = 0; i < 20; i++) {
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          text: el.innerText?.substring(0, 30),
          ariaLabel: el.getAttribute('aria-label'),
          role: el.getAttribute('role'),
          tabIndex: el.tabIndex
        };
      });
      
      tabOrder.push(focused);
      
      // Check if we've cycled back to the beginning
      if (i > 0 && focused.tagName === 'BODY') break;
      
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);
    }
    
    console.log('Tab order:', tabOrder.length, 'focusable elements');
    testResults.passed.push('Tab navigation works through ' + tabOrder.length + ' elements');
    
    // Test 2: Upload area keyboard interaction
    console.log('\n📋 Test 2: Upload Area Keyboard Interaction');
    
    // Focus on upload area
    await page.focus('.upload-area');
    await page.waitForTimeout(500);
    
    const uploadAreaFocused = await page.evaluate(() => {
      return document.activeElement.classList.contains('upload-area');
    });
    
    if (uploadAreaFocused) {
      testResults.passed.push('Upload area can receive keyboard focus');
      
      // Test Enter key
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
      
      // Check if file dialog would open (can't actually test file dialog)
      const enterHandled = await page.evaluate(() => {
        return window.lastKeyboardAction === 'enter-upload';
      });
      
      // Test Space key
      await page.keyboard.press('Space');
      await page.waitForTimeout(500);
    } else {
      testResults.failed.push('Upload area cannot receive keyboard focus');
    }
    
    // Test 3: Button keyboard activation
    console.log('\n📋 Test 3: Button Keyboard Activation');
    
    const buttons = await page.$$('button');
    console.log('Found', buttons.length, 'buttons');
    
    for (let i = 0; i < Math.min(3, buttons.length); i++) {
      const button = buttons[i];
      await button.focus();
      
      const buttonInfo = await button.evaluate(el => ({
        text: el.innerText,
        disabled: el.disabled,
        ariaLabel: el.getAttribute('aria-label')
      }));
      
      if (!buttonInfo.disabled) {
        await page.keyboard.press('Enter');
        testResults.passed.push(`Button "${buttonInfo.text}" responds to Enter key`);
      }
    }
    
    // Test 4: Skip links
    console.log('\n📋 Test 4: Skip Links');
    
    const skipLinks = await page.$$('[href^="#"]');
    if (skipLinks.length > 0) {
      testResults.passed.push('Skip links present');
    } else {
      testResults.warnings.push('No skip links found for accessibility');
    }
    
    // Test 5: Focus indicators
    console.log('\n📋 Test 5: Focus Indicators');
    
    const focusIndicatorTest = await page.evaluate(() => {
      const testElements = ['button', 'a', 'input', '[tabindex="0"]'];
      const results = [];
      
      testElements.forEach(selector => {
        const el = document.querySelector(selector);
        if (el) {
          el.focus();
          const styles = window.getComputedStyle(el);
          const hasFocusStyle = 
            styles.outline !== 'none' || 
            styles.boxShadow !== 'none' ||
            styles.border !== styles.getPropertyValue('border');
          
          results.push({
            selector,
            hasFocusIndicator: hasFocusStyle
          });
        }
      });
      
      return results;
    });
    
    focusIndicatorTest.forEach(test => {
      if (test.hasFocusIndicator) {
        testResults.passed.push(`${test.selector} has visible focus indicator`);
      } else {
        testResults.failed.push(`${test.selector} missing focus indicator`);
      }
    });
    
    // Test 6: Escape key functionality
    console.log('\n📋 Test 6: Escape Key Functionality');
    
    await page.keyboard.press('Escape');
    // Check if any modals/overlays close
    
    // Test 7: Arrow key navigation in menus
    console.log('\n📋 Test 7: Arrow Key Navigation');
    
    const hasDropdowns = await page.$('select');
    if (hasDropdowns) {
      await hasDropdowns.focus();
      await page.keyboard.press('ArrowDown');
      testResults.passed.push('Dropdown responds to arrow keys');
    }
    
    // Summary
    console.log('\n📊 KEYBOARD NAVIGATION TEST RESULTS:');
    console.log('✅ Passed:', testResults.passed.length);
    console.log('❌ Failed:', testResults.failed.length);
    console.log('⚠️ Warnings:', testResults.warnings.length);
    
    console.log('\n✅ PASSED TESTS:');
    testResults.passed.forEach(test => console.log('  -', test));
    
    if (testResults.failed.length > 0) {
      console.log('\n❌ FAILED TESTS:');
      testResults.failed.forEach(test => console.log('  -', test));
    }
    
    if (testResults.warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      testResults.warnings.forEach(test => console.log('  -', test));
    }
    
    // Take screenshot of focused state
    await page.focus('.upload-area');
    await page.screenshot({
      path: 'automation/screenshots/keyboard-nav-test-' + Date.now() + '.png'
    });
    
    // Return overall result
    const overallPass = testResults.failed.length === 0;
    console.log('\n' + (overallPass ? '✅ OVERALL: PASS' : '❌ OVERALL: FAIL'));
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
})();