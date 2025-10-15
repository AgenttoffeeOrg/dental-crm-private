/**
 * Marketing Audit Module - Google Places API Connector
 * 
 * Connects to Google Places API to fetch:
 * - Place details (reviews, ratings, photos, hours)
 * - Nearby competitors
 * - Reviews and ratings
 */

import { BaseAPIConnector } from './base-connector';

interface PlaceDetailsResponse {
  result: {
    place_id: string;
    name: string;
    formatted_address?: string;
    formatted_phone_number?: string;
    rating?: number;
    user_ratings_total?: number;
    reviews?: Array<{
      author_name: string;
      rating: number;
      text: string;
      time: number;
      relative_time_description: string;
    }>;
    photos?: Array<{
      photo_reference: string;
      height: number;
      width: number;
    }>;
    website?: string;
    business_status?: string;
    types?: string[];
    geometry?: {
      location: {
        lat: number;
        lng: number;
      };
    };
  };
  status: string;
}

interface NearbySearchResponse {
  results: Array<{
    place_id: string;
    name: string;
    vicinity?: string;
    rating?: number;
    user_ratings_total?: number;
    types?: string[];
    geometry?: {
      location: {
        lat: number;
        lng: number;
      };
    };
  }>;
  status: string;
  next_page_token?: string;
}

export class PlacesConnector extends BaseAPIConnector {
  constructor(apiKey: string) {
    super(apiKey, 'https://maps.googleapis.com/maps/api/place');
    this.validateConfig();
  }
  
  /**
   * Get detailed information about a place
   */
  async getPlaceDetails(placeId: string): Promise<PlaceDetailsResponse['result']> {
    const fields = [
      'place_id',
      'name',
      'formatted_address',
      'formatted_phone_number',
      'rating',
      'user_ratings_total',
      'reviews',
      'photos',
      'website',
      'business_status',
      'types',
      'geometry',
    ].join(',');
    
    return this.retryWithBackoff(async () => {
      const url = `${this.baseUrl}/details/json?place_id=${placeId}&fields=${fields}&key=${this.apiKey}`;
      const response = await this.makeRequest<PlaceDetailsResponse>(url);
      
      if (response.status !== 'OK') {
        throw new Error(`Places API error: ${response.status}`);
      }
      
      console.log(`[Places] Fetched details for place_id: ${placeId}`);
      return response.result;
    });
  }
  
  /**
   * Search for nearby competitors
   */
  async nearbySearch(
    lat: number,
    lng: number,
    radiusMeters: number,
    type: string = 'dentist'
  ): Promise<NearbySearchResponse['results']> {
    return this.retryWithBackoff(async () => {
      const url = `${this.baseUrl}/nearbysearch/json?location=${lat},${lng}&radius=${radiusMeters}&type=${type}&key=${this.apiKey}`;
      const response = await this.makeRequest<NearbySearchResponse>(url);
      
      if (response.status !== 'OK' && response.status !== 'ZERO_RESULTS') {
        throw new Error(`Places API error: ${response.status}`);
      }
      
      console.log(`[Places] Found ${response.results.length} nearby places`);
      return response.results;
    });
  }
  
  /**
   * Calculate distance between two points (Haversine formula)
   */
  calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  
  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
  
  /**
   * Extract review metrics from place details
   */
  extractReviewMetrics(placeDetails: PlaceDetailsResponse['result']): {
    totalCount: number;
    avgRating: number;
    recentReviews: number;
  } {
    const reviews = placeDetails.reviews || [];
    const thirtyDaysAgo = Date.now() / 1000 - (30 * 24 * 60 * 60);
    const recentReviews = reviews.filter(r => r.time > thirtyDaysAgo).length;
    
    return {
      totalCount: placeDetails.user_ratings_total || 0,
      avgRating: placeDetails.rating || 0,
      recentReviews,
    };
  }
}

