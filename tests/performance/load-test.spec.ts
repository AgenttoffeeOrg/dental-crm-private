/**
 * Performance & Load Tests
 * Tests system behavior under concurrent load
 */

import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('dashboard loads under 3 seconds', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/marketing-audit');
    await page.waitForSelector('[data-testid="composite-score"]');
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000);
  });

  test('handles concurrent audit runs', async ({ browser }) => {
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
    ]);

    const results = await Promise.all(
      contexts.map(async (context, index) => {
        const page = await context.newPage();
        await page.goto('/login');
        await page.fill('[name="email"]', `test${index}@example.com`);
        await page.fill('[name="password"]', 'password123');
        await page.click('button[type="submit"]');
        
        await page.goto('/marketing-audit');
        await page.click('button:has-text("Run Audit")');
        
        const startTime = Date.now();
        await page.waitForSelector('[data-testid="composite-score"]', { timeout: 120000 });
        const duration = Date.now() - startTime;
        
        await context.close();
        return duration;
      })
    );

    // All should complete within 2 minutes
    results.forEach(duration => {
      expect(duration).toBeLessThan(120000);
    });

    // Average should be under 60 seconds
    const avg = results.reduce((a, b) => a + b, 0) / results.length;
    expect(avg).toBeLessThan(60000);
  });

  test('API rate limiting works correctly', async ({ request }) => {
    const responses = await Promise.all(
      Array(100).fill(0).map(() =>
        request.post('/api/marketing-audit/run', {
          data: { domain: 'example.com' },
        })
      )
    );

    const rateLimited = responses.filter(r => r.status() === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });

  test('large dataset rendering performance', async ({ page }) => {
    // Mock large competitor dataset
    await page.route('**/api/marketing-audit/competitors', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          competitors: Array(100).fill(0).map((_, i) => ({
            id: `competitor-${i}`,
            name: `Competitor ${i}`,
            score: Math.random() * 100,
            metrics: {
              reviews: Math.floor(Math.random() * 1000),
              rating: (Math.random() * 2 + 3).toFixed(1),
            },
          })),
        }),
      });
    });

    const startTime = Date.now();
    await page.goto('/marketing-audit');
    await page.click('button:has-text("Competitors")');
    await page.waitForSelector('[data-testid="competitor-card"]');
    const renderTime = Date.now() - startTime;

    // Should render 100 competitors in under 2 seconds
    expect(renderTime).toBeLessThan(2000);
  });

  test('memory usage stays under 100MB', async ({ page }) => {
    await page.goto('/marketing-audit');
    
    const metrics = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });

    // Memory should stay under 100MB (100 * 1024 * 1024 bytes)
    expect(metrics).toBeLessThan(100 * 1024 * 1024);
  });

  test('scroll performance is smooth', async ({ page }) => {
    await page.goto('/marketing-audit');
    
    const fps: number[] = [];
    let lastTime = Date.now();
    
    page.on('framenavigated', () => {
      const now = Date.now();
      const frameDuration = now - lastTime;
      fps.push(1000 / frameDuration);
      lastTime = now;
    });

    // Scroll through page
    for (let i = 0; i < 10; i++) {
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(100);
    }

    // Average FPS should be above 30
    const avgFps = fps.reduce((a, b) => a + b, 0) / fps.length;
    expect(avgFps).toBeGreaterThan(30);
  });
});

