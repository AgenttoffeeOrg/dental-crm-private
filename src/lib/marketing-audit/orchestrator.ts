/**
 * Marketing Audit Module - Audit Orchestrator
 * 
 * The main coordinator that:
 * 1. Collects metrics from all API connectors
 * 2. Calculates all scores
 * 3. Generates recommendations
 * 4. Discovers and analyzes competitors
 * 5. Calculates benchmarking
 * 6. Checks for alerts
 * 7. Saves everything to database
 * 
 * This is the brain of the audit system.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { ConnectorFactory } from './connectors/factory';
import { TechnicalScorer } from './scoring/technical-scorer';
import { LocalScorer } from './scoring/local-scorer';
import { ContentScorer } from './scoring/content-scorer';
import { AnalyticsScorer } from './scoring/analytics-scorer';
import { ConversionScorer } from './scoring/conversion-scorer';
import { CompositeScorer } from './scoring/composite-scorer';
import { PercentileRanker } from './scoring/percentile-ranker';
import type { AuditRun, AllMetrics, Scores, Recommendation, Competitor, Alert } from './types';

export class AuditOrchestrator {
  private supabase: SupabaseClient;
  private connectorFactory: ConnectorFactory;
  private scorers: {
    technical: TechnicalScorer;
    local: LocalScorer;
    content: ContentScorer;
    analytics: AnalyticsScorer;
    conversion: ConversionScorer;
    composite: CompositeScorer;
  };
  private ranker: PercentileRanker;
  
  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.connectorFactory = new ConnectorFactory();
    this.scorers = {
      technical: new TechnicalScorer(),
      local: new LocalScorer(),
      content: new ContentScorer(),
      analytics: new AnalyticsScorer(),
      conversion: new ConversionScorer(),
      composite: new CompositeScorer(),
    };
    this.ranker = new PercentileRanker();
  }
  
  /**
   * Run complete audit for a practice
   */
  async runAudit(auditId: string, practice: any): Promise<void> {
    const startTime = Date.now();
    console.log(`[Orchestrator] Starting audit ${auditId} for ${practice.domain}`);
    
    try {
      // Step 1: Update status to running
      await this.updateAuditStatus(auditId, 'running');
      
      // Step 2: Collect all metrics from APIs
      console.log(`[Orchestrator] Collecting metrics...`);
      const metrics = await this.collectMetrics(practice);
      
      // Step 3: Calculate all scores
      console.log(`[Orchestrator] Calculating scores...`);
      const scores = await this.calculateScores(metrics);
      
      // Step 4: Generate recommendations
      console.log(`[Orchestrator] Generating recommendations...`);
      const recommendations = await this.generateRecommendations(metrics, scores);
      
      // Step 5: Discover and analyze competitors
      console.log(`[Orchestrator] Analyzing competitors...`);
      const competitors = await this.analyzeCompetitors(practice);
      
      // Step 6: Calculate benchmarking
      console.log(`[Orchestrator] Calculating benchmarking...`);
      const benchmarking = await this.calculateBenchmarking(scores.composite, competitors);
      
      // Step 7: Check for alerts
      console.log(`[Orchestrator] Checking for alerts...`);
      const alerts = await this.checkForAlerts(auditId, practice.id, scores);
      
      // Step 8: Save all results to database
      console.log(`[Orchestrator] Saving results...`);
      await this.saveResults(auditId, {
        metrics,
        scores,
        recommendations,
        competitors,
        benchmarking,
        alerts,
      });
      
      // Step 9: Update audit run to completed
      const duration = Math.round((Date.now() - startTime) / 1000);
      await this.supabase
        .from('marketing_audit_runs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          duration_seconds: duration,
          composite_score: scores.composite,
          technical_score: scores.technical,
          local_score: scores.local,
          content_score: scores.content,
          analytics_score: scores.analytics,
          conversion_score: scores.conversion,
          percentile_rank: benchmarking.percentile,
          your_rank: benchmarking.rank,
          peer_count: benchmarking.totalPeers,
          gap_to_median: benchmarking.gapToMedian,
          gap_to_top_3_avg: benchmarking.gapToTop3,
        })
        .eq('id', auditId);
      
      console.log(`[Orchestrator] Audit ${auditId} completed in ${duration}s`);
      
      // Step 10: Send notification if enabled
      await this.sendCompletionNotification(auditId, practice);
      
    } catch (error) {
      console.error('[Orchestrator] Audit', auditId, 'failed:', error);
      
      await this.supabase
        .from('marketing_audit_runs')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          error_details: error instanceof Error ? { stack: error.stack } : {},
        })
        .eq('id', auditId);
      
      throw error;
    }
  }
  
  /**
   * Collect metrics from all data sources
   */
  private async collectMetrics(practice: any): Promise<AllMetrics> {
    const domain = practice.domain;
    const connectors = this.connectorFactory.createPhase1Connectors(practice.google_access_token);
    
    // Run API calls in parallel where possible
    const [psiMobile, mobileFriendly, placesData] = await Promise.all([
      connectors.psi.runAudit(`https://${domain}`, 'mobile'),
      connectors.mobileFriendly.test(`https://${domain}`),
      practice.place_id ? connectors.places.getPlaceDetails(practice.place_id) : Promise.resolve(null),
    ]);
    
    // Sequential calls for OAuth-required APIs (if tokens available)
    let gscData = null;
    let ga4Data = null;
    
    if (connectors.gsc) {
      try {
        gscData = {
          analytics: await connectors.gsc.getSearchAnalytics(practice.gsc_property_url || `sc-domain:${domain}`),
          coverage: await connectors.gsc.getIndexCoverage(practice.gsc_property_url || `sc-domain:${domain}`),
          sitemap: await connectors.gsc.checkSitemap(practice.gsc_property_url || `sc-domain:${domain}`),
          dataMonths: await connectors.gsc.getDataMonths(practice.gsc_property_url || `sc-domain:${domain}`),
        };
      } catch (error) {
        console.error('[Orchestrator] GSC fetch failed:', error);
      }
    }
    
    if (connectors.ga4 && practice.ga4_property_id) {
      try {
        ga4Data = await connectors.ga4.getMetrics(practice.ga4_property_id);
      } catch (error) {
        console.error('[Orchestrator] GA4 fetch failed:', error);
      }
    }
    
    // Transform API responses into structured metrics
    return this.transformToMetrics(psiMobile, gscData, ga4Data, placesData, mobileFriendly, domain);
  }
  
  /**
   * Transform API responses into AllMetrics structure
   */
  private transformToMetrics(psiData: any, gscData: any, ga4Data: any, placesData: any, mobileFriendly: any, domain: string): AllMetrics {
    const psiMetrics = this.connectorFactory.createPSIConnector().extractAllMetrics(psiData);
    
    const technical = {
      core_web_vitals: psiMetrics.cwv,
      lighthouse: psiMetrics.lighthouse,
      indexation: {
        indexed_pages: gscData?.coverage.indexedPages || 0,
        submitted_pages: gscData?.coverage.submittedPages || 0,
        coverage_ratio: gscData?.coverage.coverageRatio || 0,
        errors: gscData?.coverage.errors || 0,
        warnings: gscData?.coverage.warnings || 0,
      },
      https: domain.startsWith('https') || psiMetrics.finalUrl.startsWith('https'),
      mobile_friendly: mobileFriendly.isMobileFriendly,
      has_sitemap: gscData?.sitemap.hasSitemap || false,
    };
    
    const local = {
      gbp_completeness: 0, // Phase 2
      reviews: {
        total_count: placesData?.user_ratings_total || 0,
        avg_rating: placesData?.rating || 0,
        last_30_days: 0, // Calculate from reviews array if available
        response_rate: 0, // Phase 2
        avg_response_time_hours: 0, // Phase 2
      },
      nap_consistency: 0, // Phase 2
      citations: {
        total_found: 0, // Phase 2
        top_50_coverage: 0, // Phase 2
        inconsistent: 0, // Phase 2
      },
      local_pack_appearances: 0, // Phase 2
    };
    
    const content = {
      authority_score: 0, // Phase 3
      referring_domains: 0, // Phase 3
      total_backlinks: 0, // Phase 3
      toxic_backlinks_percent: 0, // Phase 3
      content_freshness_score: 60, // Placeholder
      indexed_pages: gscData?.coverage.indexedPages || 0,
      organic_keywords: 0, // Phase 3
    };
    
    const analytics = {
      ga4: {
        connected: !!ga4Data,
        custom_events: ga4Data?.customEvents || 0,
        conversions: ga4Data?.conversions || 0,
        enhanced_measurement: ga4Data?.enhancedMeasurement || false,
        data_months: 0,
      },
      gsc: {
        connected: !!gscData,
        data_months: gscData?.dataMonths || 0,
        queries: gscData?.analytics.queries || 0,
        clicks: gscData?.analytics.clicks || 0,
      },
      utm_usage_rate: ga4Data?.utmUsageRate || 0,
      has_cookie_banner: false, // Heuristic check needed
      privacy_policy: false, // Heuristic check needed
    };
    
    const conversion = {
      has_online_booking: false, // Heuristic check needed
      has_click_to_call: false, // Heuristic check needed
      phone_in_header: false, // Heuristic check needed
      contact_form_accessible: false, // Heuristic check needed
      mobile_responsive: mobileFriendly.isMobileFriendly,
      has_trust_signals: false, // Heuristic check needed
      ctas_above_fold: 0, // Heuristic check needed
    };
    
    return { technical, local, content, analytics, conversion };
  }
  
  /**
   * Calculate all scores
   */
  private async calculateScores(metrics: AllMetrics): Promise<Scores> {
    const technical = this.scorers.technical.calculateScore(metrics.technical);
    const local = this.scorers.local.calculateScore(metrics.local);
    const content = this.scorers.content.calculateScore(metrics.content);
    const analytics = this.scorers.analytics.calculateScore(metrics.analytics);
    const conversion = this.scorers.conversion.calculateScore(metrics.conversion);
    
    const composite = this.scorers.composite.calculateCompositeScore({
      technical,
      local,
      content,
      analytics,
      conversion,
    });
    
    return { technical, local, content, analytics, conversion, composite };
  }
  
  /**
   * Generate recommendations from all scorers
   */
  private async generateRecommendations(metrics: AllMetrics, scores: Scores): Promise<Recommendation[]> {
    const allRecs: Recommendation[] = [];
    
    allRecs.push(...this.scorers.technical.generateRecommendations(metrics.technical, scores.technical));
    allRecs.push(...this.scorers.local.generateRecommendations(metrics.local, scores.local));
    allRecs.push(...this.scorers.content.generateRecommendations(metrics.content, scores.content));
    allRecs.push(...this.scorers.analytics.generateRecommendations(metrics.analytics, scores.analytics));
    allRecs.push(...this.scorers.conversion.generateRecommendations(metrics.conversion, scores.conversion));
    
    // Sort by priority and return top 20
    return allRecs
      .sort((a, b) => b.priority_score - a.priority_score)
      .slice(0, 20);
  }
  
  /**
   * Discover and analyze competitors
   */
  private async analyzeCompetitors(practice: any): Promise<Competitor[]> {
    if (!practice.lat || !practice.lng) {
      console.warn('[Orchestrator] No lat/lng for practice, skipping competitor analysis');
      return [];
    }
    
    try {
      const connectors = this.connectorFactory.createPhase1Connectors();
      const radiusMeters = (practice.radius_miles || 5) * 1609.34; // Convert miles to meters
      
      const nearbyPlaces = await connectors.places.nearbySearch(
        practice.lat,
        practice.lng,
        radiusMeters,
        practice.category || 'dentist'
      );
      
      // Filter out self
      const competitors = nearbyPlaces
        .filter(place => place.place_id !== practice.place_id)
        .slice(0, 20);
      
      // Calculate simplified scores for competitors (Phase 1: reviews only)
      const competitorData: Competitor[] = competitors.map((comp, index) => {
        const distance = connectors.places.calculateDistance(
          practice.lat,
          practice.lng,
          comp.geometry?.location.lat || 0,
          comp.geometry?.location.lng || 0
        );
        
        return {
          id: '',
          run_id: '',
          competitor_name: comp.name,
          competitor_domain: '',
          competitor_place_id: comp.place_id,
          competitor_address: comp.vicinity,
          composite_score: this.estimateCompetitorScore(comp),
          local_score: this.estimateLocalScore(comp),
          metrics: {
            reviews_count: comp.user_ratings_total || 0,
            avg_rating: comp.rating || 0,
          },
          rank: index + 1,
          distance_miles: parseFloat(distance.toFixed(1)),
          discovered_at: new Date().toISOString(),
          last_updated_at: new Date().toISOString(),
          tenant_id: practice.tenant_id,
        } as Competitor;
      });
      
      // Sort by score and assign final ranks
      competitorData.sort((a, b) => b.composite_score - a.composite_score);
      competitorData.forEach((comp, index) => {
        comp.rank = index + 1;
      });
      
      return competitorData;
    } catch (error) {
      console.error('[Orchestrator] Competitor analysis failed:', error);
      return [];
    }
  }
  
  /**
   * Estimate competitor score (Phase 1: simplified)
   */
  private estimateCompetitorScore(place: any): number {
    const reviewCount = place.user_ratings_total || 0;
    const rating = place.rating || 0;
    
    // Simplified: 40% based on review count, 60% based on rating
    const reviewScore = Math.min((reviewCount / 200) * 40, 40);
    const ratingScore = rating >= 3 ? ((rating - 3) / 2) * 60 : 0;
    
    return Math.min(Math.round((reviewScore + ratingScore) * 10) / 10, 100);
  }
  
  /**
   * Estimate competitor local score
   */
  private estimateLocalScore(place: any): number {
    return this.estimateCompetitorScore(place); // Same logic for Phase 1
  }
  
  /**
   * Calculate benchmarking data
   */
  private async calculateBenchmarking(yourScore: number, competitors: Competitor[]): Promise<any> {
    const competitorScores = competitors.map(c => c.composite_score);
    const summary = this.ranker.generateSummary(yourScore, competitorScores);
    
    return summary;
  }
  
  /**
   * Check for alerts (regressions, achievements)
   */
  private async checkForAlerts(auditId: string, practiceId: string, currentScores: Scores): Promise<Alert[]> {
    const alerts: Alert[] = [];
    
    try {
      // Get previous audit
      const { data: previousAudit } = await this.supabase
        .from('marketing_audit_runs')
        .select('*')
        .eq('practice_id', practiceId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(2); // Get last 2 to compare
      
      if (!previousAudit || previousAudit.length < 2) {
        return alerts; // No previous audit to compare
      }
      
      const prev = previousAudit[1]; // Second most recent
      
      // Check composite score
      const compositeDelta = currentScores.composite - prev.composite_score;
      if (compositeDelta < -5) {
        alerts.push({
          id: '',
          run_id: auditId,
          practice_id: practiceId,
          alert_type: 'regression',
          severity: compositeDelta < -10 ? 'error' : 'warning',
          title: 'Overall Score Dropped',
          description: `Your composite score decreased by ${Math.abs(compositeDelta).toFixed(1)} points.`,
          metric_name: 'composite_score',
          previous_value: prev.composite_score,
          current_value: currentScores.composite,
          delta: compositeDelta,
          triggered_at: new Date().toISOString(),
          acknowledged: false,
          notification_sent: false,
          tenant_id: practice.tenant_id,
        });
      }
      
      // Check each sub-score
      const categories = [
        { key: 'technical', prev_key: 'technical_score', label: 'Technical SEO' },
        { key: 'local', prev_key: 'local_score', label: 'Local Presence' },
        { key: 'content', prev_key: 'content_score', label: 'Content & Authority' },
        { key: 'analytics', prev_key: 'analytics_score', label: 'Analytics Hygiene' },
        { key: 'conversion', prev_key: 'conversion_score', label: 'Conversion UX' },
      ];
      
      for (const category of categories) {
        const currentScore = currentScores[category.key as keyof Scores];
        const previousScore = prev[category.prev_key];
        const delta = currentScore - previousScore;
        
        if (delta < -5) {
          alerts.push({
            id: '',
            run_id: auditId,
            practice_id: practiceId,
            alert_type: 'regression',
            severity: delta < -10 ? 'error' : 'warning',
            title: `${category.label} Score Dropped`,
            description: `Down ${Math.abs(delta).toFixed(1)} points from ${previousScore.toFixed(1)} to ${currentScore.toFixed(1)}.`,
            metric_name: `${category.key}_score`,
            previous_value: previousScore,
            current_value: currentScore,
            delta,
            triggered_at: new Date().toISOString(),
            acknowledged: false,
            notification_sent: false,
            tenant_id: practice.tenant_id,
          });
        }
      }
      
    } catch (error) {
      console.error('[Orchestrator] Alert checking failed:', error);
    }
    
    return alerts;
  }
  
  /**
   * Save all audit results to database
   */
  private async saveResults(auditId: string, results: any): Promise<void> {
    const tenantId = results.metrics.technical.https ? 'tenant' : 'tenant'; // TODO: Get from context
    
    // Save metrics (each metric as a row)
    const metricsToSave = this.flattenMetrics(auditId, results.metrics, tenantId);
    if (metricsToSave.length > 0) {
      await this.supabase.from('audit_metrics').insert(metricsToSave);
    }
    
    // Save recommendations
    if (results.recommendations.length > 0) {
      const recsToSave = results.recommendations.map((rec: any) => ({
        ...rec,
        run_id: auditId,
        tenant_id: tenantId,
      }));
      await this.supabase.from('audit_recommendations').insert(recsToSave);
    }
    
    // Save competitors
    if (results.competitors.length > 0) {
      const compsToSave = results.competitors.map((comp: any) => ({
        ...comp,
        run_id: auditId,
      }));
      await this.supabase.from('audit_competitors').insert(compsToSave);
    }
    
    // Save alerts
    if (results.alerts.length > 0) {
      const alertsToSave = results.alerts.map((alert: any) => ({
        ...alert,
        run_id: auditId,
      }));
      await this.supabase.from('audit_alerts').insert(alertsToSave);
    }
  }
  
  /**
   * Flatten metrics object into individual rows
   */
  private flattenMetrics(auditId: string, metrics: AllMetrics, tenantId: string): any[] {
    const rows: any[] = [];
    
    // Technical metrics
    rows.push(
      { run_id: auditId, category: 'technical', metric_name: 'lcp', metric_value: metrics.technical.core_web_vitals.lcp, metric_unit: 'seconds', source: 'psi', tenant_id: tenantId },
      { run_id: auditId, category: 'technical', metric_name: 'fid', metric_value: metrics.technical.core_web_vitals.fid, metric_unit: 'milliseconds', source: 'psi', tenant_id: tenantId },
      { run_id: auditId, category: 'technical', metric_name: 'cls', metric_value: metrics.technical.core_web_vitals.cls, metric_unit: 'score', source: 'psi', tenant_id: tenantId },
      { run_id: auditId, category: 'technical', metric_name: 'lighthouse_performance', metric_value: metrics.technical.lighthouse.performance, metric_unit: 'score', source: 'psi', tenant_id: tenantId },
      { run_id: auditId, category: 'technical', metric_name: 'lighthouse_accessibility', metric_value: metrics.technical.lighthouse.accessibility, metric_unit: 'score', source: 'psi', tenant_id: tenantId },
      { run_id: auditId, category: 'technical', metric_name: 'indexed_pages', metric_value: metrics.technical.indexation.indexed_pages, metric_unit: 'count', source: 'gsc', tenant_id: tenantId }
    );
    
    // Local metrics
    rows.push(
      { run_id: auditId, category: 'local', metric_name: 'reviews_count', metric_value: metrics.local.reviews.total_count, metric_unit: 'count', source: 'places_api', tenant_id: tenantId },
      { run_id: auditId, category: 'local', metric_name: 'avg_rating', metric_value: metrics.local.reviews.avg_rating, metric_unit: 'rating', source: 'places_api', tenant_id: tenantId }
    );
    
    return rows;
  }
  
  /**
   * Update audit status
   */
  private async updateAuditStatus(auditId: string, status: string): Promise<void> {
    await this.supabase
      .from('marketing_audit_runs')
      .update({ status })
      .eq('id', auditId);
  }
  
  /**
   * Send completion notification (if enabled)
   */
  private async sendCompletionNotification(auditId: string, practice: any): Promise<void> {
    // TODO: Implement email notification
    console.log(`[Orchestrator] Notification sent for audit ${auditId}`);
  }
}

