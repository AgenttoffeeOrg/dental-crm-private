/**
 * Marketing Audit Module - Mobile-Friendly Test Connector
 * 
 * Connects to Google Mobile-Friendly Test API to check mobile usability.
 */

import { BaseAPIConnector } from './base-connector';

interface MobileFriendlyResponse {
  mobileFriendliness: 'MOBILE_FRIENDLY' | 'NOT_MOBILE_FRIENDLY';
  mobileFriendlyIssues?: Array<{
    rule: string;
  }>;
  resourceIssues?: Array<{
    blockedResource: {
      url: string;
    };
  }>;
  screenshot?: {
    data: string;
    mimeType: string;
  };
  testStatus?: {
    status: string;
    details?: string;
  };
}

export class MobileFriendlyConnector extends BaseAPIConnector {
  constructor(apiKey: string) {
    super(apiKey, 'https://searchconsole.googleapis.com/v1/urlTestingTools/mobileFriendlyTest:run');
    this.validateConfig();
  }
  
  /**
   * Test if a URL is mobile-friendly
   */
  async test(url: string): Promise<{ isMobileFriendly: boolean; issues: string[] }> {
    return this.retryWithBackoff(async () => {
      const response = await this.makeRequest<MobileFriendlyResponse>(
        `${this.baseUrl}?key=${this.apiKey}`,
        {
          method: 'POST',
          body: JSON.stringify({ url }),
        }
      );
      
      const isMobileFriendly = response.mobileFriendliness === 'MOBILE_FRIENDLY';
      const issues = response.mobileFriendlyIssues?.map(issue => issue.rule) || [];
      
      console.log(`[MobileFriendly] Test completed for ${url}: ${isMobileFriendly ? 'PASS' : 'FAIL'}`);
      
      return { isMobileFriendly, issues };
    });
  }
}

