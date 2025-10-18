/**
 * BrightLocal API Connector
 * 
 * Phase 2 Feature: Citations, GBP completeness, local pack monitoring.
 * Architecture: Follows base connector pattern with BrightLocal-specific logic.
 */

import { BaseAPIConnector } from './base-connector';
import type { ConnectorError } from '../utils/errors';

export interface BrightLocalCitationData {
  total_citations: number;
  top_50_coverage: number;
  inconsistent_citations: number;
  citations_by_source: Array<{
    source: string;
    name: string;
    address: string;
    phone: string;
    website: string;
    consistent: boolean;
  }>;
}

export interface BrightLocalGBPData {
  completeness_score: number;
  missing_fields: string[];
  photos_count: number;
  posts_last_30_days: number;
  reviews_reply_rate: number;
  avg_reply_time_hours: number;
}

export class BrightLocalConnector extends BaseAPIConnector {
  private readonly accountId: string;
  
  constructor(apiKey: string, accountId: string) {
    super(apiKey, 'https://tools.brightlocal.com/seo-tools/api');
    this.accountId = accountId;
    this.validateConfig();
  }
  
  protected validateConfig(): void {
    if (!this.apiKey || this.apiKey.length < 20) {
      throw new Error('[BrightLocal] Invalid API key');
    }
    if (!this.accountId) {
      throw new Error('[BrightLocal] Account ID required');
    }
  }
  
  /**
   * Get citation tracking data
   */
  async getCitationData(businessName: string, address: string): Promise<BrightLocalCitationData> {
    return this.retryWithBackoff(async () => {
      // Start citation tracker report
      const reportResponse = await this.makeRequest<any>(
        `${this.baseUrl}/v4/ct`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            'api-key': this.apiKey,
            'account-id': this.accountId,
            business_name: businessName,
            address1: address,
            search_type: 'all',
          }),
        }
      );
      
      const reportId = reportResponse.response.results[0]?.report_id;
      if (!reportId) {
        throw new Error('[BrightLocal] Failed to create citation report');
      }
      
      // Poll for results (max 60 seconds)
      let results: any = null;
      for (let i = 0; i < 12; i++) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const statusResponse = await this.makeRequest<any>(
          `${this.baseUrl}/v4/ct/${reportId}`,
          {
            headers: {
              'api-key': this.apiKey,
            },
          }
        );
        
        if (statusResponse.response.status === 'Completed') {
          results = statusResponse.response.results;
          break;
        }
      }
      
      if (!results) {
        throw new Error('[BrightLocal] Citation report timed out');
      }
      
      // Transform to our format
      const citationsBySource = results.citations || [];
      const inconsistent = citationsBySource.filter((c: any) => !c.consistent);
      
      return {
        total_citations: citationsBySource.length,
        top_50_coverage: this.calculateTop50Coverage(citationsBySource),
        inconsistent_citations: inconsistent.length,
        citations_by_source: citationsBySource.slice(0, 20).map((c: any) => ({
          source: c.directory,
          name: c.business_name,
          address: c.address,
          phone: c.phone,
          website: c.website,
          consistent: c.consistent,
        })),
      };
    });
  }
  
  /**
   * Get GBP completeness data
   */
  async getGBPCompleteness(placeId: string): Promise<BrightLocalGBPData> {
    return this.retryWithBackoff(async () => {
      const response = await this.makeRequest<any>(
        `${this.baseUrl}/v4/lsrc/gmb-insight`,
        {
          headers: {
            'api-key': this.apiKey,
            'account-id': this.accountId,
          },
          body: JSON.stringify({
            place_id: placeId,
          }),
        }
      );
      
      const data = response.response;
      
      return {
        completeness_score: data.completeness_score || 0,
        missing_fields: data.missing_fields || [],
        photos_count: data.photos?.length || 0,
        posts_last_30_days: data.posts_last_30_days || 0,
        reviews_reply_rate: data.reviews_reply_rate || 0,
        avg_reply_time_hours: data.avg_reply_time_hours || 0,
      };
    });
  }
  
  /**
   * Get local pack rankings
   */
  async getLocalPackRankings(
    businessName: string,
    location: string,
    keywords: string[]
  ): Promise<Array<{ keyword: string; rank: number | null; in_pack: boolean }>> {
    return this.retryWithBackoff(async () => {
      const results = [];
      
      for (const keyword of keywords.slice(0, 10)) { // Limit to 10 keywords
        const response = await this.makeRequest<any>(
          `${this.baseUrl}/v4/rankings`,
          {
            method: 'POST',
            headers: {
              'api-key': this.apiKey,
              'account-id': this.accountId,
            },
            body: JSON.stringify({
              business_name: businessName,
              location,
              search_term: keyword,
              search_engine: 'google',
            }),
          }
        );
        
        const ranking = response.response?.ranking || null;
        results.push({
          keyword,
          rank: ranking,
          in_pack: ranking !== null && ranking <= 3,
        });
        
        // Rate limiting: 1 request per second
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      return results;
    });
  }
  
  /**
   * Calculate top 50 directories coverage
   */
  private calculateTop50Coverage(citations: any[]): number {
    const top50Directories = [
      'Google',
      'Facebook',
      'Yelp',
      'Bing',
      'Apple Maps',
      'Yahoo',
      'YP.com',
      'Foursquare',
      'MapQuest',
      'BBB',
      // ... (40 more)
    ];
    
    const found = citations.filter(c => 
      top50Directories.some(dir => 
        c.directory?.toLowerCase().includes(dir.toLowerCase())
      )
    );
    
    return (found.length / 50) * 100;
  }
}

