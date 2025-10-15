/**
 * Query Optimizer - Unit Tests
 */

import { QueryOptimizer } from '../../performance/query-optimizer';

// Mock Supabase client
const mockSupabase: any = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest.fn(),
  lt: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
};

describe('QueryOptimizer', () => {
  let optimizer: QueryOptimizer;
  
  beforeEach(() => {
    optimizer = new QueryOptimizer(mockSupabase);
    jest.clearAllMocks();
  });
  
  describe('getLatestAudit', () => {
    it('should fetch latest completed audit', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: 'audit-1', composite_score: 85.5 },
        error: null,
      });
      
      const result = await optimizer.getLatestAudit('practice-1');
      
      expect(result.data).toBeDefined();
      expect(mockSupabase.from).toHaveBeenCalledWith('marketing_audit_runs');
      expect(mockSupabase.eq).toHaveBeenCalledWith('practice_id', 'practice-1');
      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'completed');
      expect(mockSupabase.order).toHaveBeenCalledWith('completed_at', { ascending: false });
      expect(mockSupabase.limit).toHaveBeenCalledWith(1);
    });
  });
  
  describe('getAuditHistory', () => {
    it('should use cursor-based pagination', async () => {
      mockSupabase.select.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.order.mockReturnThis();
      mockSupabase.limit.mockReturnThis();
      mockSupabase.lt.mockResolvedValue({
        data: [{ id: 'audit-1', completed_at: '2025-01-15T10:00:00Z' }],
        error: null,
        count: 10,
      });
      
      const cursor = '2025-01-14T10:00:00Z';
      const result = await optimizer.getAuditHistory('practice-1', 10, cursor);
      
      expect(mockSupabase.lt).toHaveBeenCalledWith('completed_at', cursor);
      expect(result.data).toBeDefined();
      expect(result.nextCursor).toBeDefined();
    });
  });
  
  describe('batchInsertRecommendations', () => {
    it('should insert multiple recommendations in single query', async () => {
      const recommendations = [
        { title: 'Rec 1', impact: 'high' },
        { title: 'Rec 2', impact: 'medium' },
        { title: 'Rec 3', impact: 'low' },
      ];
      
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ data: recommendations, error: null }),
      });
      
      const result = await optimizer.batchInsertRecommendations(recommendations);
      
      expect(result.data).toHaveLength(3);
    });
    
    it('should handle empty array', async () => {
      const result = await optimizer.batchInsertRecommendations([]);
      
      expect(result.data).toBeNull();
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });
  
  describe('getAggregatedMetrics', () => {
    it('should calculate statistics from audit history', async () => {
      const audits = [
        { composite_score: 70, completed_at: '2025-01-01' },
        { composite_score: 75, completed_at: '2025-01-08' },
        { composite_score: 80, completed_at: '2025-01-15' },
      ];
      
      mockSupabase.select.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.order.mockReturnThis();
      mockSupabase.gte.mockResolvedValue({ data: audits, error: null });
      
      const result = await optimizer.getAggregatedMetrics('practice-1', 'month');
      
      expect(result).toBeDefined();
      expect(result?.avg).toBeCloseTo(75, 0);
      expect(result?.min).toBe(70);
      expect(result?.max).toBe(80);
      expect(result?.change).toBe(10);
      expect(result?.trend).toBe('up');
    });
  });
});

