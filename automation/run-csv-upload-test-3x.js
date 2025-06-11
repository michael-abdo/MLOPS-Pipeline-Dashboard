/**
 * Run CSV Upload Test 3 Times
 * Tests the CSV upload automation multiple times to verify consistency
 */

const { execSync } = require('child_process');
const path = require('path');

async function runTestMultipleTimes() {
    console.log('🚀 Running CSV Upload Test 3 Times\n');
    console.log('=' .repeat(50));
    
    const results = [];
    
    for (let i = 1; i <= 3; i++) {
        console.log(`\n📋 Test Run ${i}/3`);
        console.log('-'.repeat(50));
        
        const startTime = Date.now();
        let success = false;
        let error = null;
        
        try {
            // Run the test
            execSync('node tests/upload-csv.test.js', {
                stdio: 'inherit',
                cwd: path.join(__dirname)
            });
            success = true;
            console.log(`✅ Test ${i} completed successfully`);
        } catch (err) {
            error = err.message;
            console.error(`❌ Test ${i} failed:`, error);
        }
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        results.push({
            run: i,
            success,
            duration: `${duration}s`,
            error
        });
        
        // Wait between tests
        if (i < 3) {
            console.log('\n⏳ Waiting 5 seconds before next test...');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    
    results.forEach(result => {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        console.log(`Run ${result.run}: ${status} (${result.duration})`);
        if (result.error) {
            console.log(`  Error: ${result.error}`);
        }
    });
    
    const successCount = results.filter(r => r.success).length;
    const totalDuration = results.reduce((sum, r) => sum + parseFloat(r.duration), 0).toFixed(2);
    
    console.log('\n' + '-'.repeat(50));
    console.log(`Total Successful: ${successCount}/3`);
    console.log(`Total Time: ${totalDuration}s`);
    console.log(`Average Time: ${(totalDuration / 3).toFixed(2)}s per test`);
    console.log('='.repeat(50));
}

// Run the tests
runTestMultipleTimes().catch(console.error);