/**
 * Semrush API Connector
 * 
 * Phase 3: Enterprise backlink analysis, keyword tracking, competitor research.
 * Architecture: Follows base connector pattern with Semrush-specific endpoints.
 */

import { BaseAPIConnector } from './base-connector';

export interface SemrushDomainOverview {
  domain_authority: number;
  backlinks_count: number;
  referring_domains: number;
  organic_keywords: number;
  organic_traffic: number;
  organic_cost: number;
  adwords_keywords: number;
  adwords_traffic: number;
  adwords_cost: number;
}

export interface SemrushBacklinkData {
  total_backlinks: number;
  referring_domains: number;
  dofollow_backlinks: number;
  nofollow_backlinks: number;
  authority_score: number;
  toxic_score: number;
  top_backlinks: Array<{
    source_url: string;
    target_url: string;
    anchor_text: string;
    authority_score: number;
    follow_type: 'dofollow' | 'nofollow';
    first_seen: string;
  }>;
}

export interface SemrushKeywordData {
  keyword: string;
  position: number;
  previous_position: number;
  search_volume: number;
  keyword_difficulty: number;
  cpc: number;
  url: string;
  traffic_percent: number;
}

export class SemrushConnector extends BaseAPIConnector {
  constructor(apiKey: string) {
    super(apiKey, 'https://api.semrush.com');
    this.validateConfig();
  }
  
  protected validateConfig(): void {
    if (!this.apiKey || this.apiKey.length < 20) {
      throw new Error('[Semrush] Invalid API key');
    }
  }
  
  /**
   * Get domain overview
   */
  async getDomainOverview(domain: string): Promise<SemrushDomainOverview> {
    return this.retryWithBackoff(async () => {
      const response = await this.makeRequest<string>(
        `${this.baseUrl}/?type=domain_ranks&key=${this.apiKey}&export_columns=Dn,Rk,Or,Ot,Oc,Ad,At,Ac&domain=${domain}&database=us`
      );
      
      // Parse CSV response
      const lines = response.split('\n').filter(l => l.trim());
      if (lines.length < 2) {
        throw new Error('[Semrush] No data returned');
      }
      
      const data = lines[1].split(';');
      
      return {
        domain_authority: parseInt(data[1]) || 0,
        backlinks_count: 0, // Not in this endpoint
        referring_domains: 0, // Not in this endpoint
        organic_keywords: parseInt(data[2]) || 0,
        organic_traffic: parseFloat(data[3]) || 0,
        organic_cost: parseFloat(data[4]) || 0,
        adwords_keywords: parseInt(data[5]) || 0,
        adwords_traffic: parseFloat(data[6]) || 0,
        adwords_cost: parseFloat(data[7]) || 0,
      };
    });
  }
  
  /**
   * Get backlink analytics
   */
  async getBacklinks(domain: string, limit: number = 100): Promise<SemrushBacklinkData> {
    return this.retryWithBackoff(async () => {
      // Get backlink overview
      const overviewResponse = await this.makeRequest<string>(
        `${this.baseUrl}/?type=backlinks_overview&key=${this.apiKey}&target=${domain}&target_type=root_domain`
      );
      
      const overviewLines = overviewResponse.split('\n').filter(l => l.trim());
      const overviewData = overviewLines.length > 1 ? overviewLines[1].split('\t') : [];
      
      // Get top backlinks
      const backlinksResponse = await this.makeRequest<string>(
        `${this.baseUrl}/?type=backlinks&key=${this.apiKey}&target=${domain}&target_type=root_domain&export_columns=page_ascore,source_url,target_url,anchor,external_num,internal_num,redirect,form,nofollow,image,frame,text_pre,text_post&display_limit=${limit}`
      );
      
      const backlinksLines = backlinksResponse.split('\n').filter(l => l.trim());
      const topBacklinks = backlinksLines.slice(1).map(line => {
        const cols = line.split('\t');
        return {
          source_url: cols[1] || '',
          target_url: cols[2] || '',
          anchor_text: cols[3] || '',
          authority_score: parseInt(cols[0]) || 0,
          follow_type: (cols[8] === '1' ? 'nofollow' : 'dofollow') as 'dofollow' | 'nofollow',
          first_seen: new Date().toISOString(), // Semrush doesn't provide this easily
        };
      });
      
      return {
        total_backlinks: parseInt(overviewData[1]) || 0,
        referring_domains: parseInt(overviewData[2]) || 0,
        dofollow_backlinks: parseInt(overviewData[3]) || 0,
        nofollow_backlinks: parseInt(overviewData[4]) || 0,
        authority_score: parseInt(overviewData[0]) || 0,
        toxic_score: 0, // Requires separate endpoint
        top_backlinks: topBacklinks,
      };
    });
  }
  
  /**
   * Get organic keyword rankings
   */
  async getOrganicKeywords(domain: string, limit: number = 100): Promise<SemrushKeywordData[]> {
    return this.retryWithBackoff(async () => {
      const response = await this.makeRequest<string>(
        `${this.baseUrl}/?type=domain_organic&key=${this.apiKey}&export_columns=Ph,Po,Pp,Nq,Cp,Ur,Tr,Td&domain=${domain}&database=us&display_limit=${limit}`
      );
      
      const lines = response.split('\n').filter(l => l.trim());
      
      return lines.slice(1).map(line => {
        const cols = line.split(';');
        return {
          keyword: cols[0] || '',
          position: parseInt(cols[1]) || 0,
          previous_position: parseInt(cols[2]) || 0,
          search_volume: parseInt(cols[3]) || 0,
          keyword_difficulty: parseFloat(cols[7]) || 0,
          cpc: parseFloat(cols[4]) || 0,
          url: cols[5] || '',
          traffic_percent: parseFloat(cols[6]) || 0,
        };
      });
    });
  }
  
  /**
   * Get competitor analysis
   */
  async getCompetitors(domain: string, limit: number = 10): Promise<Array<{
    domain: string;
    common_keywords: number;
    se_keywords: number;
    se_traffic: number;
    competition_level: number;
  }>> {
    return this.retryWithBackoff(async () => {
      const response = await this.makeRequest<string>(
        `${this.baseUrl}/?type=domain_organic_organic&key=${this.apiKey}&export_columns=Dn,Cr,Np,Or,Ot,Oc,Ad&domain=${domain}&database=us&display_limit=${limit}`
      );
      
      const lines = response.split('\n').filter(l => l.trim());
      
      return lines.slice(1).map(line => {
        const cols = line.split(';');
        return {
          domain: cols[0] || '',
          common_keywords: parseInt(cols[1]) || 0,
          se_keywords: parseInt(cols[3]) || 0,
          se_traffic: parseFloat(cols[4]) || 0,
          competition_level: parseFloat(cols[2]) || 0,
        };
      });
    });
  }
  
  /**
   * Get keyword difficulty
   */
  async getKeywordDifficulty(keywords: string[]): Promise<Array<{
    keyword: string;
    difficulty: number;
  }>> {
    return this.retryWithBackoff(async () => {
      // Semrush limits batch queries
      const batch = keywords.slice(0, 100);
      const keywordParam = batch.join(',');
      
      const response = await this.makeRequest<string>(
        `${this.baseUrl}/?type=phrase_this&key=${this.apiKey}&export_columns=Ph,Nq,Cp,Co,Nr,Td&phrase=${encodeURIComponent(keywordParam)}&database=us`
      );
      
      const lines = response.split('\n').filter(l => l.trim());
      
      return lines.slice(1).map(line => {
        const cols = line.split(';');
        return {
          keyword: cols[0] || '',
          difficulty: parseFloat(cols[5]) || 0,
        };
      });
    });
  }
}

