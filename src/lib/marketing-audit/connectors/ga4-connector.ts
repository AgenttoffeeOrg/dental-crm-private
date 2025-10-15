/**
 * Marketing Audit Module - Google Analytics 4 Connector
 * 
 * Connects to GA4 Data API to fetch:
 * - Traffic metrics (sessions, users, page views)
 * - Event tracking (custom events, conversions)
 * - Source/medium data (organic, paid, direct)
 * - UTM parameter usage
 */

import { google } from 'googleapis';
import { BaseAPIConnector } from './base-connector';

export interface GA4Metrics {
  sessions: number;
  users: number;
  organicSessions: number;
  customEvents: number;
  conversions: number;
  enhancedMeasurement: boolean;
  utmTaggedSessions: number;
  totalSessions: number;
  utmUsageRate: number;
}

export class GA4Connector extends BaseAPIConnector {
  private auth: any;
  private analyticsData: any;
  
  constructor(accessToken: string) {
    super(accessToken, 'https://analyticsdata.googleapis.com/v1beta');
    this.validateConfig();
    this.initializeClient();
  }
  
  private initializeClient() {
    this.auth = new google.auth.OAuth2();
    this.auth.setCredentials({ access_token: this.apiKey });
    
    this.analyticsData = google.analyticsdata({
      version: 'v1beta',
      auth: this.auth,
    });
  }
  
  /**
   * Get core metrics from GA4
   */
  async getMetrics(propertyId: string): Promise<GA4Metrics> {
    return this.retryWithBackoff(async () => {
      // Get overall sessions and users
      const overallResponse = await this.analyticsData.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
          metrics: [
            { name: 'sessions' },
            { name: 'activeUsers' },
          ],
        },
      });
      
      // Get organic sessions
      const organicResponse = await this.analyticsData.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'sessionDefaultChannelGrouping' }],
          metrics: [{ name: 'sessions' }],
          dimensionFilter: {
            filter: {
              fieldName: 'sessionDefaultChannelGrouping',
              stringFilter: { value: 'Organic Search' },
            },
          },
        },
      });
      
      // Get UTM-tagged sessions
      const utmResponse = await this.analyticsData.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'sessionCampaignName' }],
          metrics: [{ name: 'sessions' }],
          dimensionFilter: {
            filter: {
              fieldName: 'sessionCampaignName',
              stringFilter: { matchType: 'EXACT', value: '(not set)', inListFilter: { values: [] } },
              notExpression: true,
            },
          },
        },
      });
      
      // Get custom events
      const eventsResponse = await this.analyticsData.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'eventName' }],
          metrics: [{ name: 'eventCount' }],
        },
      });
      
      // Parse responses
      const sessions = parseInt(overallResponse.data.rows?.[0]?.metricValues?.[0]?.value || '0');
      const users = parseInt(overallResponse.data.rows?.[0]?.metricValues?.[1]?.value || '0');
      const organicSessions = parseInt(organicResponse.data.rows?.[0]?.metricValues?.[0]?.value || '0');
      
      const utmTaggedSessions = (utmResponse.data.rows || []).reduce((sum, row) => {
        return sum + parseInt(row.metricValues?.[0]?.value || '0');
      }, 0);
      
      // Count custom events (excluding GA4 auto-collected events)
      const autoEvents = ['page_view', 'session_start', 'first_visit', 'scroll', 'click', 'file_download', 'video_start', 'video_progress', 'video_complete'];
      const customEvents = (eventsResponse.data.rows || []).filter(row => {
        const eventName = row.dimensionValues?.[0]?.value || '';
        return !autoEvents.includes(eventName);
      }).length;
      
      // Assume Enhanced Measurement is enabled if we see auto events
      const enhancedMeasurement = (eventsResponse.data.rows || []).some(row => {
        const eventName = row.dimensionValues?.[0]?.value || '';
        return autoEvents.includes(eventName);
      });
      
      // Calculate UTM usage rate
      const utmUsageRate = sessions > 0 ? (utmTaggedSessions / sessions) * 100 : 0;
      
      const metrics: GA4Metrics = {
        sessions,
        users,
        organicSessions,
        customEvents,
        conversions: 0, // TODO: Fetch actual conversions
        enhancedMeasurement,
        utmTaggedSessions,
        totalSessions: sessions,
        utmUsageRate,
      };
      
      console.log(`[GA4] Metrics fetched for property ${propertyId}`);
      return metrics;
    });
  }
  
  /**
   * Check if GA4 is properly connected
   */
  async checkConnection(propertyId: string): Promise<boolean> {
    try {
      await this.analyticsData.properties.get({
        name: `properties/${propertyId}`,
      });
      return true;
    } catch (error) {
      console.error('[GA4] Connection check failed:', error);
      return false;
    }
  }
}

