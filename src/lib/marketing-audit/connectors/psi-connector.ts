/**
 * Marketing Audit Module - PageSpeed Insights Connector
 * 
 * Connects to Google PageSpeed Insights API v5 to fetch:
 * - Core Web Vitals (LCP, FID, CLS)
 * - Lighthouse scores (Performance, Accessibility, Best Practices, SEO)
 * - Lab data and field data
 */

import { BaseAPIConnector } from './base-connector';
import type { PSIResponse, CoreWebVitals, LighthouseScores } from '../types';

export class PSIConnector extends BaseAPIConnector {
  constructor(apiKey: string) {
    super(apiKey, 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
    this.validateConfig();
  }
  
  /**
   * Run PageSpeed Insights audit
   */
  async runAudit(url: string, strategy: 'mobile' | 'desktop' = 'mobile'): Promise<PSIResponse> {
    const params = new URLSearchParams({
      url,
      key: this.apiKey,
      strategy,
      category: ['performance', 'accessibility', 'best-practices', 'seo'].join(','),
    });
    
    return this.retryWithBackoff(async () => {
      const response = await this.makeRequest<PSIResponse>(
        `${this.baseUrl}?${params.toString()}`
      );
      
      console.log(`[PSI] Audit completed for ${url} (${strategy})`);
      return response;
    });
  }
  
  /**
   * Extract Core Web Vitals from PSI response
   */
  extractCoreWebVitals(response: PSIResponse): CoreWebVitals {
    try {
      const audits = response.lighthouseResult?.audits;
      
      if (!audits) {
        throw new Error('No Lighthouse audits found in PSI response');
      }
      
      const lcp = (audits['largest-contentful-paint']?.numericValue || 0) / 1000; // Convert to seconds
      const fid = audits['max-potential-fid']?.numericValue || audits['total-blocking-time']?.numericValue || 0;
      const cls = audits['cumulative-layout-shift']?.numericValue || 0;
      
      return {
        lcp,
        fid,
        cls,
        assessment: this.assessCWV(lcp, fid, cls),
      };
    } catch (error) {
      this.logError(error instanceof Error ? error : new Error(String(error)), { response });
      throw error;
    }
  }
  
  /**
   * Extract Lighthouse scores from PSI response
   */
  extractLighthouseScores(response: PSIResponse): LighthouseScores {
    try {
      const categories = response.lighthouseResult?.categories;
      
      if (!categories) {
        throw new Error('No Lighthouse categories found in PSI response');
      }
      
      return {
        performance: Math.round((categories.performance?.score || 0) * 100),
        accessibility: Math.round((categories.accessibility?.score || 0) * 100),
        bestPractices: Math.round((categories['best-practices']?.score || 0) * 100),
        seo: Math.round((categories.seo?.score || 0) * 100),
      };
    } catch (error) {
      this.logError(error instanceof Error ? error : new Error(String(error)), { response });
      throw error;
    }
  }
  
  /**
   * Extract all relevant metrics in one go
   */
  extractAllMetrics(response: PSIResponse): {
    cwv: CoreWebVitals;
    lighthouse: LighthouseScores;
    requestedUrl: string;
    finalUrl: string;
    fetchTime: string;
  } {
    return {
      cwv: this.extractCoreWebVitals(response),
      lighthouse: this.extractLighthouseScores(response),
      requestedUrl: response.lighthouseResult?.requestedUrl || '',
      finalUrl: response.lighthouseResult?.finalUrl || '',
      fetchTime: response.lighthouseResult?.fetchTime || new Date().toISOString(),
    };
  }
  
  /**
   * Assess overall Core Web Vitals status
   */
  private assessCWV(lcp: number, fid: number, cls: number): 'good' | 'needs_improvement' | 'poor' {
    const lcpGood = lcp <= 2.5;
    const lcpPoor = lcp > 4.0;
    const fidGood = fid <= 100;
    const fidPoor = fid > 300;
    const clsGood = cls <= 0.1;
    const clsPoor = cls > 0.25;
    
    // If all metrics are good, overall is good
    if (lcpGood && fidGood && clsGood) {
      return 'good';
    }
    
    // If any metric is poor, overall is poor
    if (lcpPoor || fidPoor || clsPoor) {
      return 'poor';
    }
    
    // Otherwise, needs improvement
    return 'needs_improvement';
  }
}

