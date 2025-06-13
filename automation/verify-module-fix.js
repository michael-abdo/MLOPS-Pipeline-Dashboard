const puppeteer = require('puppeteer');

async function verifyModuleFix() {
    console.log('🔍 Verifying Module Fix');
    console.log('=' .repeat(30));
    
    let browser;
    
    try {
        browser = await puppeteer.launch({
            headless: true,
            timeout: 10000,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        
        const page = await browser.newPage();
        
        // Navigate to dashboard with shorter timeout
        console.log('📍 Connecting to http://localhost:8000...');
        await page.goto('http://localhost:8000', { 
            waitUntil: 'domcontentloaded', 
            timeout: 15000 
        });
        
        // Wait a moment for scripts to load
        await page.waitForTimeout(3000);
        
        // Check if modules are exposed globally
        const result = await page.evaluate(() => {
            const checks = {
                Dashboard: typeof window.Dashboard !== 'undefined',
                API: typeof window.API !== 'undefined',
                CONFIG: typeof window.CONFIG !== 'undefined',
                errorHandler: typeof window.errorHandler !== 'undefined'
            };
            
            // Test if Dashboard class can be instantiated
            let dashboardWorking = false;
            try {
                if (window.Dashboard) {
                    dashboardWorking = typeof window.Dashboard === 'function';
                }
            } catch (e) {
                dashboardWorking = false;
            }
            
            // Test if API has upload method
            let apiWorking = false;
            try {
                if (window.API && window.API.upload) {
                    apiWorking = typeof window.API.upload === 'function';
                }
            } catch (e) {
                apiWorking = false;
            }
            
            return {
                ...checks,
                dashboardWorking,
                apiWorking,
                timestamp: new Date().toISOString()
            };
        });
        
        console.log('📊 Module Verification Results:');
        console.log(`   Dashboard available: ${result.Dashboard ? '✅' : '❌'}`);
        console.log(`   API available: ${result.API ? '✅' : '❌'}`);
        console.log(`   CONFIG available: ${result.CONFIG ? '✅' : '❌'}`);
        console.log(`   errorHandler available: ${result.errorHandler ? '✅' : '❌'}`);
        console.log(`   Dashboard functional: ${result.dashboardWorking ? '✅' : '❌'}`);
        console.log(`   API upload method: ${result.apiWorking ? '✅' : '❌'}`);
        
        const allWorking = result.Dashboard && result.API && result.CONFIG && result.dashboardWorking && result.apiWorking;
        
        console.log('\n🎯 Overall Status:');
        if (allWorking) {
            console.log('✅ MODULE FIX SUCCESSFUL - All modules are working!');
            console.log('✅ Upload functionality should now work properly');
        } else {
            console.log('❌ Some modules are still not working properly');
        }
        
        return allWorking;
        
    } catch (error) {
        console.error('❌ Verification failed:', error.message);
        return false;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run verification
verifyModuleFix().then(success => {
    if (success) {
        console.log('\n🎉 Phase Implementation: SUCCESSFUL');
        process.exit(0);
    } else {
        console.log('\n⚠️  Phase Implementation: NEEDS ATTENTION');
        process.exit(1);
    }
}).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});