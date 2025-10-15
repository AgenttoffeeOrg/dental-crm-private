/**
 * Marketing Audit Module - Connector Factory
 * 
 * Factory pattern for creating API connectors with proper configuration.
 * Centralizes connector instantiation and credential management.
 */

import { PSIConnector } from './psi-connector';
import { GSCConnector } from './gsc-connector';
import { GA4Connector } from './ga4-connector';
import { PlacesConnector } from './places-connector';
import { MobileFriendlyConnector } from './mobile-friendly-connector';
import { OAuthHandler } from '../utils/oauth-handler';

export class ConnectorFactory {
  private googleApiKey: string;
  
  constructor(googleApiKey?: string) {
    this.googleApiKey = googleApiKey || process.env.GOOGLE_API_KEY || '';
    
    if (!this.googleApiKey) {
      console.warn('[ConnectorFactory] Google API key not configured');
    }
  }
  
  /**
   * Create PageSpeed Insights connector
   */
  createPSIConnector(): PSIConnector {
    return new PSIConnector(this.googleApiKey);
  }
  
  /**
   * Create Google Search Console connector (requires OAuth token)
   */
  createGSCConnector(accessToken: string): GSCConnector {
    return new GSCConnector(accessToken);
  }
  
  /**
   * Create GA4 connector (requires OAuth token)
   */
  createGA4Connector(accessToken: string): GA4Connector {
    return new GA4Connector(accessToken);
  }
  
  /**
   * Create Places API connector
   */
  createPlacesConnector(): PlacesConnector {
    return new PlacesConnector(this.googleApiKey);
  }
  
  /**
   * Create Mobile-Friendly Test connector
   */
  createMobileFriendlyConnector(): MobileFriendlyConnector {
    return new MobileFriendlyConnector(this.googleApiKey);
  }
  
  /**
   * Create OAuth handler
   */
  createOAuthHandler(): OAuthHandler {
    return new OAuthHandler();
  }
  
  /**
   * Create all free-tier connectors (Phase 1)
   */
  createPhase1Connectors(googleAccessToken?: string): {
    psi: PSIConnector;
    gsc: GSCConnector | null;
    ga4: GA4Connector | null;
    places: PlacesConnector;
    mobileFriendly: MobileFriendlyConnector;
  } {
    return {
      psi: this.createPSIConnector(),
      gsc: googleAccessToken ? this.createGSCConnector(googleAccessToken) : null,
      ga4: googleAccessToken ? this.createGA4Connector(googleAccessToken) : null,
      places: this.createPlacesConnector(),
      mobileFriendly: this.createMobileFriendlyConnector(),
    };
  }
}

// Singleton instance
export const connectorFactory = new ConnectorFactory();

