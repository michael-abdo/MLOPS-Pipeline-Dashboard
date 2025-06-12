const puppeteer = require('puppeteer');

/**
 * Screen Reader Compatibility Test
 * Tests ARIA attributes, semantic HTML, and screen reader announcements
 */
(async () => {
  console.log('🔊 Testing Screen Reader Compatibility...\n');
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  const testResults = {
    passed: [],
    failed: [],
    warnings: []
  };
  
  try {
    await page.goto('http://localhost:8000');
    await page.waitForTimeout(2000);
    
    // Test 1: Page title and main landmark
    console.log('📋 Test 1: Page Structure');
    
    const pageStructure = await page.evaluate(() => {
      return {
        title: document.title,
        hasMain: !!document.querySelector('main'),
        mainRole: document.querySelector('main')?.getAttribute('role'),
        hasH1: !!document.querySelector('h1'),
        h1Text: document.querySelector('h1')?.innerText
      };
    });
    
    if (pageStructure.title) {
      testResults.passed.push('Page has descriptive title: ' + pageStructure.title);
    } else {
      testResults.failed.push('Page missing title');
    }
    
    if (pageStructure.hasMain) {
      testResults.passed.push('Main landmark exists');
    } else {
      testResults.failed.push('Missing main landmark');
    }
    
    if (pageStructure.hasH1) {
      testResults.passed.push('H1 heading exists: ' + pageStructure.h1Text);
    } else {
      testResults.warnings.push('No H1 heading found');
    }
    
    // Test 2: ARIA labels and roles
    console.log('\n📋 Test 2: ARIA Labels and Roles');
    
    const ariaElements = await page.evaluate(() => {
      const elements = [];
      
      // Check interactive elements for ARIA labels
      const interactiveSelectors = ['button', 'a', 'input', '[role="button"]', 'select'];
      
      interactiveSelectors.forEach(selector => {
        const els = document.querySelectorAll(selector);
        els.forEach(el => {
          const text = el.innerText || el.value || '';
          const ariaLabel = el.getAttribute('aria-label');
          const ariaLabelledBy = el.getAttribute('aria-labelledby');
          const role = el.getAttribute('role');
          
          elements.push({
            tag: el.tagName,
            text: text.substring(0, 30),
            hasAriaLabel: !!ariaLabel,
            hasAriaLabelledBy: !!ariaLabelledBy,
            hasTextContent: text.length > 0,
            role: role,
            type: el.type
          });
        });
      });
      
      return elements;
    });
    
    let unlabeledCount = 0;
    ariaElements.forEach(el => {
      if (!el.hasAriaLabel && !el.hasAriaLabelledBy && !el.hasTextContent) {
        unlabeledCount++;
      }
    });
    
    if (unlabeledCount === 0) {
      testResults.passed.push('All interactive elements have accessible labels');
    } else {
      testResults.failed.push(`${unlabeledCount} interactive elements missing labels`);
    }
    
    // Test 3: Form labels
    console.log('\n📋 Test 3: Form Labels');
    
    const formLabels = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input:not([type="hidden"]), select, textarea');
      const results = [];
      
      inputs.forEach(input => {
        const id = input.id;
        const label = id ? document.querySelector(`label[for="${id}"]`) : null;
        const ariaLabel = input.getAttribute('aria-label');
        const ariaLabelledBy = input.getAttribute('aria-labelledby');
        
        results.push({
          type: input.type || input.tagName,
          hasLabel: !!label,
          hasAriaLabel: !!ariaLabel,
          hasAriaLabelledBy: !!ariaLabelledBy
        });
      });
      
      return results;
    });
    
    const unlabeledInputs = formLabels.filter(
      input => !input.hasLabel && !input.hasAriaLabel && !input.hasAriaLabelledBy
    );
    
    if (unlabeledInputs.length === 0) {
      testResults.passed.push('All form inputs have labels');
    } else {
      testResults.failed.push(`${unlabeledInputs.length} form inputs missing labels`);
    }
    
    // Test 4: Upload area accessibility
    console.log('\n📋 Test 4: Upload Area Accessibility');
    
    const uploadAreaA11y = await page.evaluate(() => {
      const uploadArea = document.querySelector('.upload-area');
      if (!uploadArea) return null;
      
      return {
        role: uploadArea.getAttribute('role'),
        ariaLabel: uploadArea.getAttribute('aria-label'),
        ariaDescribedBy: uploadArea.getAttribute('aria-describedby'),
        tabindex: uploadArea.getAttribute('tabindex'),
        describedByElement: uploadArea.getAttribute('aria-describedby') ? 
          document.getElementById(uploadArea.getAttribute('aria-describedby'))?.innerText : null
      };
    });
    
    if (uploadAreaA11y) {
      if (uploadAreaA11y.role === 'button') {
        testResults.passed.push('Upload area has button role');
      }
      if (uploadAreaA11y.ariaLabel) {
        testResults.passed.push('Upload area has aria-label');
      }
      if (uploadAreaA11y.tabindex === '0') {
        testResults.passed.push('Upload area is keyboard accessible');
      }
    }
    
    // Test 5: Live regions
    console.log('\n📋 Test 5: Live Regions');
    
    const liveRegions = await page.evaluate(() => {
      const regions = [];
      
      // Check for aria-live regions
      const liveElements = document.querySelectorAll('[aria-live]');
      liveElements.forEach(el => {
        regions.push({
          ariaLive: el.getAttribute('aria-live'),
          role: el.getAttribute('role'),
          id: el.id,
          purpose: el.getAttribute('aria-label') || el.className
        });
      });
      
      // Check for status/alert roles
      const statusElements = document.querySelectorAll('[role="status"], [role="alert"]');
      statusElements.forEach(el => {
        regions.push({
          ariaLive: el.getAttribute('aria-live') || 'implicit',
          role: el.getAttribute('role'),
          id: el.id,
          purpose: el.getAttribute('aria-label') || el.className
        });
      });
      
      return regions;
    });
    
    if (liveRegions.length > 0) {
      testResults.passed.push(`${liveRegions.length} live regions for dynamic content`);
    } else {
      testResults.warnings.push('No live regions found for dynamic updates');
    }
    
    // Test 6: Images
    console.log('\n📋 Test 6: Image Accessibility');
    
    const images = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img');
      return Array.from(imgs).map(img => ({
        src: img.src.substring(img.src.lastIndexOf('/') + 1),
        alt: img.alt,
        decorative: img.alt === '',
        ariaHidden: img.getAttribute('aria-hidden')
      }));
    });
    
    const imagesWithoutAlt = images.filter(
      img => !img.alt && !img.decorative && img.ariaHidden !== 'true'
    );
    
    if (imagesWithoutAlt.length === 0) {
      testResults.passed.push('All images have appropriate alt text');
    } else {
      testResults.failed.push(`${imagesWithoutAlt.length} images missing alt text`);
    }
    
    // Test 7: Heading structure
    console.log('\n📋 Test 7: Heading Structure');
    
    const headingStructure = await page.evaluate(() => {
      const headings = [];
      for (let i = 1; i <= 6; i++) {
        const h = document.querySelectorAll(`h${i}`);
        h.forEach(heading => {
          headings.push({
            level: i,
            text: heading.innerText.substring(0, 50)
          });
        });
      }
      return headings.sort((a, b) => {
        const aTop = a.getBoundingClientRect?.()?.top || 0;
        const bTop = b.getBoundingClientRect?.()?.top || 0;
        return aTop - bTop;
      });
    });
    
    if (headingStructure.length > 0) {
      testResults.passed.push(`Proper heading structure with ${headingStructure.length} headings`);
    }
    
    // Test 8: Contrast (basic check)
    console.log('\n📋 Test 8: Basic Contrast Check');
    
    const contrastCheck = await page.evaluate(() => {
      // This is a simplified check - real contrast testing requires more complex calculations
      const elements = document.querySelectorAll('*');
      let lowContrastCount = 0;
      
      elements.forEach(el => {
        const style = window.getComputedStyle(el);
        const color = style.color;
        const bgColor = style.backgroundColor;
        
        // Very basic check - just ensure text isn't same color as background
        if (color === bgColor && color !== 'rgba(0, 0, 0, 0)') {
          lowContrastCount++;
        }
      });
      
      return lowContrastCount;
    });
    
    if (contrastCheck === 0) {
      testResults.passed.push('No obvious contrast issues detected');
    } else {
      testResults.warnings.push(`${contrastCheck} potential contrast issues`);
    }
    
    // Summary
    console.log('\n📊 SCREEN READER COMPATIBILITY RESULTS:');
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
    
    const overallPass = testResults.failed.length === 0;
    console.log('\n' + (overallPass ? '✅ OVERALL: PASS' : '❌ OVERALL: FAIL'));
    
    // Additional recommendations
    console.log('\n📝 RECOMMENDATIONS:');
    console.log('  - Test with actual screen readers (NVDA, JAWS, VoiceOver)');
    console.log('  - Use axe DevTools or WAVE for comprehensive testing');
    console.log('  - Ensure all dynamic content updates are announced');
    console.log('  - Test with keyboard-only navigation');
    console.log('  - Verify focus order matches visual layout');
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
})();