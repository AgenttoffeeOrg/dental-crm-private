/**
 * Attribution Engine - Unit Tests
 */

import { AttributionEngine } from '../attribution/attribution-engine';
import type { AttributionTouchpoint } from '../attribution/attribution-engine';

describe('AttributionEngine', () => {
  const createTouchpoint = (source: string, daysAgo: number): AttributionTouchpoint => ({
    id: `tp-${source}-${daysAgo}`,
    contact_id: 'contact-1',
    source,
    medium: 'test',
    timestamp: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
    page_url: 'https://example.com',
    utm_params: { source },
  });
  
  describe('First Touch Attribution', () => {
    it('should attribute 100% to first touchpoint', () => {
      const engine = new AttributionEngine('first_touch');
      const touchpoints = [
        createTouchpoint('organic', 10),
        createTouchpoint('paid', 5),
        createTouchpoint('social', 1),
      ];
      
      const attribution = engine.calculateAttribution(touchpoints, 1000);
      
      expect(attribution['organic']).toBe(1000);
      expect(attribution['paid']).toBeUndefined();
      expect(attribution['social']).toBeUndefined();
    });
  });
  
  describe('Last Touch Attribution', () => {
    it('should attribute 100% to last touchpoint', () => {
      const engine = new AttributionEngine('last_touch');
      const touchpoints = [
        createTouchpoint('organic', 10),
        createTouchpoint('paid', 5),
        createTouchpoint('social', 1),
      ];
      
      const attribution = engine.calculateAttribution(touchpoints, 1000);
      
      expect(attribution['social']).toBe(1000);
      expect(attribution['organic']).toBeUndefined();
      expect(attribution['paid']).toBeUndefined();
    });
  });
  
  describe('Linear Attribution', () => {
    it('should distribute credit equally', () => {
      const engine = new AttributionEngine('linear');
      const touchpoints = [
        createTouchpoint('organic', 10),
        createTouchpoint('paid', 5),
        createTouchpoint('social', 1),
      ];
      
      const attribution = engine.calculateAttribution(touchpoints, 900);
      
      expect(attribution['organic']).toBe(300);
      expect(attribution['paid']).toBe(300);
      expect(attribution['social']).toBe(300);
    });
    
    it('should combine credit for duplicate sources', () => {
      const engine = new AttributionEngine('linear');
      const touchpoints = [
        createTouchpoint('organic', 10),
        createTouchpoint('organic', 5),
      ];
      
      const attribution = engine.calculateAttribution(touchpoints, 1000);
      
      expect(attribution['organic']).toBe(1000);
    });
  });
  
  describe('Position-Based Attribution', () => {
    it('should give 40% to first, 40% to last, 20% to middle', () => {
      const engine = new AttributionEngine('position_based');
      const touchpoints = [
        createTouchpoint('organic', 10),
        createTouchpoint('paid', 5),
        createTouchpoint('social', 1),
      ];
      
      const attribution = engine.calculateAttribution(touchpoints, 1000);
      
      expect(attribution['organic']).toBe(400); // First: 40%
      expect(attribution['paid']).toBe(200); // Middle: 20%
      expect(attribution['social']).toBe(400); // Last: 40%
    });
    
    it('should split 50/50 for two touchpoints', () => {
      const engine = new AttributionEngine('position_based');
      const touchpoints = [
        createTouchpoint('organic', 10),
        createTouchpoint('paid', 1),
      ];
      
      const attribution = engine.calculateAttribution(touchpoints, 1000);
      
      expect(attribution['organic']).toBe(500);
      expect(attribution['paid']).toBe(500);
    });
  });
  
  describe('generateReport', () => {
    it('should generate comprehensive attribution report', () => {
      const engine = new AttributionEngine('linear');
      const deals = [
        {
          id: 'deal-1',
          value: 5000,
          won_date: new Date(),
          touchpoints: [
            createTouchpoint('organic', 20),
            createTouchpoint('paid', 10),
          ],
        },
        {
          id: 'deal-2',
          value: 3000,
          won_date: new Date(),
          touchpoints: [
            createTouchpoint('organic', 15),
            createTouchpoint('social', 5),
          ],
        },
      ];
      
      const report = engine.generateReport(deals);
      
      expect(report.total_deals).toBe(2);
      expect(report.total_revenue).toBe(8000);
      expect(report.by_source['organic']).toBeDefined();
      expect(report.by_source['organic'].deals).toBe(2);
      expect(report.by_source['organic'].revenue).toBeGreaterThan(0);
    });
  });
  
  describe('calculateCampaignROI', () => {
    it('should calculate ROI correctly', () => {
      const engine = new AttributionEngine();
      const roi = engine.calculateCampaignROI('summer-campaign', 1000, 2000);
      
      expect(roi.profit).toBe(1000);
      expect(roi.roi_percent).toBe(100);
      expect(roi.roas).toBe(2);
    });
    
    it('should handle negative ROI', () => {
      const engine = new AttributionEngine();
      const roi = engine.calculateCampaignROI('bad-campaign', 1000, 500);
      
      expect(roi.profit).toBe(-500);
      expect(roi.roi_percent).toBe(-50);
      expect(roi.roas).toBe(0.5);
    });
  });
});

