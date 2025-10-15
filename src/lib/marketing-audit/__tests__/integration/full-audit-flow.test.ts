/**
 * Integration Test: Full Audit Flow
 * 
 * Tests the complete audit workflow end-to-end.
 */

import { AuditOrchestrator } from '../../orchestrator';
import { createClient } from '@/lib/supabase-client';

// Mock Supabase
jest.mock('@/lib/supabase-client');

// Mock all connectors
jest.mock('../../connectors/psi-connector');
jest.mock('../../connectors/gsc-connector');
jest.mock('../../connectors/ga4-connector');

describe('Full Audit Flow Integration Test', () => {
  let orchestrator: AuditOrchestrator;
  let mockSupabase: any;
  
  beforeEach(() => {
    orchestrator = new AuditOrchestrator();
    
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: {}, error: null }),
      eq: jest.fn().mockReturnThis(),
    };
    
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });
  
  it('should complete full audit workflow', async () => {
    const practice = {
      id: 'practice-1',
      name: 'Test Dental Practice',
      domain: 'testdental.com',
      tenant_id: 'tenant-1',
      location: {
        lat: 40.7128,
        lng: -74.0060,
      },
    };
    
    // Run audit
    const result = await orchestrator.runAudit(practice);
    
    // Verify audit was created
    expect(result).toBeDefined();
    expect(result.composite_score).toBeGreaterThanOrEqual(0);
    expect(result.composite_score).toBeLessThanOrEqual(100);
    
    // Verify sub-scores exist
    expect(result.technical_score).toBeDefined();
    expect(result.local_score).toBeDefined();
    expect(result.content_score).toBeDefined();
    expect(result.analytics_score).toBeDefined();
    expect(result.conversion_score).toBeDefined();
    
    // Verify recommendations were generated
    expect(result.recommendations).toBeDefined();
    expect(Array.isArray(result.recommendations)).toBe(true);
    
    // Verify recommendations have required fields
    if (result.recommendations.length > 0) {
      const rec = result.recommendations[0];
      expect(rec.title).toBeDefined();
      expect(rec.description).toBeDefined();
      expect(rec.impact).toMatch(/^(low|medium|high)$/);
      expect(rec.effort).toMatch(/^(low|medium|high)$/);
      expect(rec.priority_score).toBeGreaterThanOrEqual(0);
    }
  }, 30000); // 30 second timeout for full audit
  
  it('should handle missing data gracefully', async () => {
    const practice = {
      id: 'practice-2',
      name: 'Minimal Practice',
      domain: 'minimal.com',
      tenant_id: 'tenant-2',
      // No location data
    };
    
    // Should not throw, but complete with partial data
    const result = await orchestrator.runAudit(practice);
    
    expect(result).toBeDefined();
    expect(result.status).toBe('completed');
    // Scores might be lower due to missing data, but should exist
    expect(result.composite_score).toBeGreaterThanOrEqual(0);
  });
  
  it('should save audit results to database', async () => {
    const practice = {
      id: 'practice-3',
      name: 'DB Test Practice',
      domain: 'dbtest.com',
      tenant_id: 'tenant-3',
    };
    
    await orchestrator.runAudit(practice);
    
    // Verify database insert was called
    expect(mockSupabase.from).toHaveBeenCalledWith('marketing_audit_runs');
    expect(mockSupabase.insert).toHaveBeenCalled();
  });
});

