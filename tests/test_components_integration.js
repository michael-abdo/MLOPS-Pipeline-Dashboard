/**
 * Integration test for UI components
 * Tests that all components load and function correctly
 */

import { Card, Metric, ProgressBar, Grid, initializeUIComponents } from '../static/js/components/ui-components.js';

console.log('Testing UI Components...');

// Test results
const results = {
    passed: 0,
    failed: 0,
    tests: []
};

function test(name, fn) {
    try {
        fn();
        results.passed++;
        results.tests.push({ name, status: 'PASSED' });
        console.log(`✅ ${name}`);
    } catch (error) {
        results.failed++;
        results.tests.push({ name, status: 'FAILED', error: error.message });
        console.error(`❌ ${name}:`, error.message);
    }
}

// Initialize components
initializeUIComponents();

// Test 1: Card Component
test('Card.create() creates card element', () => {
    const card = Card.create({
        title: 'Test Card',
        content: 'Test content',
        id: 'testCard'
    });
    if (!card) throw new Error('Card not created');
    if (card.tagName !== 'DIV') throw new Error('Card is not a div element');
    if (!card.classList.contains('card')) throw new Error('Card missing .card class');
    if (card.id !== 'testCard') throw new Error('Card ID not set correctly');
});

test('Card with icon renders correctly', () => {
    const card = Card.create({
        title: 'Test',
        icon: '🚀',
        content: 'Test'
    });
    const title = card.querySelector('h3');
    if (!title) throw new Error('Title not found');
    if (!title.textContent.includes('🚀')) throw new Error('Icon not rendered');
});

test('Collapsible card toggles on click', () => {
    const card = Card.create({
        title: 'Collapsible',
        content: 'Content',
        collapsible: true
    });
    const header = card.querySelector('.card-header');
    if (!header.classList.contains('collapsible')) throw new Error('Header not marked as collapsible');
});

test('Card.updateContent() updates content', () => {
    const card = Card.create({
        title: 'Update Test',
        content: 'Original',
        id: 'updateTestCard'
    });
    document.body.appendChild(card);
    Card.updateContent('updateTestCard', 'Updated content');
    const content = card.querySelector('.card-content');
    if (content.innerHTML !== 'Updated content') throw new Error('Content not updated');
    document.body.removeChild(card);
});

// Test 2: Metric Component
test('Metric.create() creates metric element', () => {
    const metric = Metric.create({
        value: 42,
        label: 'Test Metric',
        format: 'number',
        id: 'testMetric'
    });
    if (!metric) throw new Error('Metric not created');
    if (!metric.classList.contains('metric')) throw new Error('Metric missing .metric class');
});

test('Metric formats values correctly', () => {
    // Test percent format
    const percentMetric = Metric.create({ value: 0.945, format: 'percent' });
    const percentValue = percentMetric.querySelector('.metric-value');
    if (percentValue.textContent !== '94.5%') throw new Error('Percent format incorrect');
    
    // Test currency format
    const currencyMetric = Metric.create({ value: 1234.56, format: 'currency' });
    const currencyValue = currencyMetric.querySelector('.metric-value');
    if (!currencyValue.textContent.includes('$')) throw new Error('Currency format incorrect');
    
    // Test number format
    const numberMetric = Metric.create({ value: 1000, format: 'number' });
    const numberValue = numberMetric.querySelector('.metric-value');
    if (numberValue.textContent !== '1,000') throw new Error('Number format incorrect');
});

test('Metric shows trend indicator', () => {
    const metric = Metric.create({
        value: 100,
        label: 'Test',
        trend: 'up',
        trendValue: 5
    });
    const trend = metric.querySelector('.metric-trend');
    if (!trend) throw new Error('Trend indicator not found');
    if (!trend.classList.contains('trend-up')) throw new Error('Trend class not applied');
    if (!trend.textContent.includes('↑')) throw new Error('Up arrow not shown');
    if (!trend.textContent.includes('5%')) throw new Error('Trend value not shown');
});

test('Metric.update() updates value with animation', () => {
    const metric = Metric.create({ value: 0, id: 'animTestMetric' });
    document.body.appendChild(metric);
    Metric.update('animTestMetric', 100, { format: 'number' });
    const valueEl = metric.querySelector('.metric-value');
    if (!valueEl.classList.contains('updating')) throw new Error('Animation class not added');
    document.body.removeChild(metric);
});

// Test 3: ProgressBar Component
test('ProgressBar.create() creates progress bar', () => {
    const progress = ProgressBar.create({
        progress: 75,
        label: 'Test Progress',
        id: 'testProgress'
    });
    if (!progress) throw new Error('ProgressBar not created');
    if (!progress.classList.contains('progress-container')) throw new Error('Missing container class');
});

test('ProgressBar shows correct progress', () => {
    const progress = ProgressBar.create({ progress: 60 });
    const fill = progress.querySelector('.progress-fill');
    if (fill.style.width !== '60%') throw new Error('Progress width incorrect');
});

test('ProgressBar applies style classes', () => {
    const successBar = ProgressBar.create({ progress: 100, style: 'success' });
    const successFill = successBar.querySelector('.progress-fill');
    if (!successFill.classList.contains('progress-success')) throw new Error('Success style not applied');
    
    const warningBar = ProgressBar.create({ progress: 70, style: 'warning' });
    const warningFill = warningBar.querySelector('.progress-fill');
    if (!warningFill.classList.contains('progress-warning')) throw new Error('Warning style not applied');
});

test('ProgressBar.update() updates progress', () => {
    const progress = ProgressBar.create({ progress: 0, id: 'updateProgress' });
    document.body.appendChild(progress);
    ProgressBar.update('updateProgress', 50);
    const fill = progress.querySelector('.progress-fill');
    if (fill.style.width !== '50%') throw new Error('Progress not updated');
    document.body.removeChild(progress);
});

// Test 4: Grid System
test('Grid.create() creates grid element', () => {
    const grid = Grid.create({
        columns: 3,
        gap: 'lg',
        children: ['<div>1</div>', '<div>2</div>', '<div>3</div>']
    });
    if (!grid) throw new Error('Grid not created');
    if (!grid.classList.contains('grid')) throw new Error('Missing grid class');
    if (!grid.classList.contains('grid-3')) throw new Error('Column class not applied');
    if (!grid.classList.contains('gap-lg')) throw new Error('Gap class not applied');
});

test('Grid applies responsive classes', () => {
    const grid = Grid.create({
        columns: 4,
        responsive: { sm: 1, md: 2, lg: 4 }
    });
    if (!grid.classList.contains('grid-sm-1')) throw new Error('Small breakpoint not applied');
    if (!grid.classList.contains('grid-md-2')) throw new Error('Medium breakpoint not applied');
    if (!grid.classList.contains('grid-lg-4')) throw new Error('Large breakpoint not applied');
});

test('Grid.createMetricGrid() creates metric grid', () => {
    const metrics = [
        { value: 100, label: 'Test 1' },
        { value: 200, label: 'Test 2' }
    ];
    const grid = Grid.createMetricGrid(metrics);
    if (!grid.classList.contains('metric-grid')) throw new Error('Metric grid class not applied');
    const metricElements = grid.querySelectorAll('.metric');
    if (metricElements.length !== 2) throw new Error('Incorrect number of metrics');
});

// Test 5: Component Styles Added
test('UI component styles are injected', () => {
    const styles = document.getElementById('ui-components-styles');
    if (!styles) throw new Error('Component styles not injected');
    if (styles.tagName !== 'STYLE') throw new Error('Styles element is not a style tag');
});

// Print results
console.log('\n=== Test Results ===');
console.log(`Total tests: ${results.passed + results.failed}`);
console.log(`Passed: ${results.passed}`);
console.log(`Failed: ${results.failed}`);
console.log('\nDetailed Results:');
results.tests.forEach(test => {
    console.log(`${test.status === 'PASSED' ? '✅' : '❌'} ${test.name}${test.error ? ': ' + test.error : ''}`);
});

// Return results for external use
export { results };