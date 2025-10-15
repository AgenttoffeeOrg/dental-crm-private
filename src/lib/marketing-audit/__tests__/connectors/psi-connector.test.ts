/**
 * PSI Connector Tests
 */

import { PSIConnector } from '../../connectors/psi-connector';

// Mock fetch
global.fetch = jest.fn();

describe('PSIConnector', () => {
  let connector: PSIConnector;
  
  beforeEach(() => {
    connector = new PSIConnector('test-api-key');
    jest.clearAllMocks();
  });
  
  describe('runPageSpeedTest', () => {
    it('should fetch PageSpeed data successfully', async () => {
      const mockResponse = {
        lighthouseResult: {
          categories: {
            performance: { score: 0.95 },
            accessibility: { score: 0.88 },
            'best-practices': { score: 0.92 },
            seo: { score: 1.0 },
          },
          audits: {
            'largest-contentful-paint': {
              displayValue: '1.2 s',
              numericValue: 1200,
            },
            'cumulative-layout-shift': {
              displayValue: '0.05',
              numericValue: 0.05,
            },
            'total-blocking-time': {
              displayValue: '50 ms',
              numericValue: 50,
            },
          },
        },
      };
      
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });
      
      const result = await connector.runPageSpeedTest('https://example.com', 'mobile');
      
      expect(result.lighthouse.performance).toBe(95);
      expect(result.lighthouse.accessibility).toBe(88);
      expect(result.lighthouse.seo).toBe(100);
      expect(result.core_web_vitals.lcp).toBe(1.2);
      expect(result.core_web_vitals.cls).toBe(0.05);
    });
    
    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });
      
      await expect(connector.runPageSpeedTest('https://example.com')).rejects.toThrow();
    });
    
    it('should handle both mobile and desktop tests', async () => {
      const mockResponse = {
        lighthouseResult: {
          categories: {
            performance: { score: 0.95 },
            accessibility: { score: 0.88 },
            'best-practices': { score: 0.92 },
            seo: { score: 1.0 },
          },
          audits: {},
        },
      };
      
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });
      
      await connector.runPageSpeedTest('https://example.com', 'desktop');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('strategy=desktop'),
        expect.any(Object)
      );
    });
  });
  
  describe('getCoreWebVitals', () => {
    it('should extract Core Web Vitals correctly', async () => {
      const mockResponse = {
        lighthouseResult: {
          categories: {
            performance: { score: 0.95 },
            accessibility: { score: 0.88 },
            'best-practices': { score: 0.92 },
            seo: { score: 1.0 },
          },
          audits: {
            'largest-contentful-paint': {
              numericValue: 2400,
            },
            'cumulative-layout-shift': {
              numericValue: 0.1,
            },
            'total-blocking-time': {
              numericValue: 200,
            },
          },
        },
      };
      
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });
      
      const result = await connector.getCoreWebVitals('https://example.com');
      
      expect(result.lcp).toBe(2.4);
      expect(result.cls).toBe(0.1);
      expect(result.fid).toBeCloseTo(200, 0);
      expect(result.assessment).toBe('needs_improvement'); // LCP is 2.4s
    });
    
    it('should assess Core Web Vitals correctly', () => {
      // Good
      expect(connector['assessCWV'](2.0, 80, 0.05)).toBe('good');
      
      // Needs improvement
      expect(connector['assessCWV'](3.0, 200, 0.15)).toBe('needs_improvement');
      
      // Poor
      expect(connector['assessCWV'](5.0, 400, 0.3)).toBe('poor');
    });
  });
});

