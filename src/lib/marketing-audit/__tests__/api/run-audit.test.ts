/**
 * API Route Tests - Run Audit
 * 
 * Integration tests for /api/marketing-audit/run endpoint
 */

import { POST } from '@/app/api/marketing-audit/run/route';
import { createServerClient } from '@/lib/supabase-server';

// Mock Supabase
jest.mock('@/lib/supabase-server');

// Mock Orchestrator
jest.mock('@/lib/marketing-audit/orchestrator', () => ({
  AuditOrchestrator: jest.fn().mockImplementation(() => ({
    runAudit: jest.fn().mockResolvedValue({
      id: 'test-audit-id',
      status: 'completed',
      composite_score: 78.5,
    }),
  })),
}));

describe('POST /api/marketing-audit/run', () => {
  let mockSupabase: any;
  
  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
    };
    
    (createServerClient as jest.Mock).mockReturnValue(mockSupabase);
  });
  
  it('should start audit for authenticated user', async () => {
    // Mock authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });
    
    // Mock user lookup
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'user-123', tenant_id: 'tenant-123' },
          }),
        }),
      }),
    });
    
    const request = new Request('http://localhost:3000/api/marketing-audit/run', {
      method: 'POST',
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.audit_id).toBe('test-audit-id');
  });
  
  it('should return 401 for unauthenticated user', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });
    
    const request = new Request('http://localhost:3000/api/marketing-audit/run', {
      method: 'POST',
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
  });
  
  it('should return 404 if practice not found', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });
    
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
          }),
        }),
      }),
    });
    
    const request = new Request('http://localhost:3000/api/marketing-audit/run', {
      method: 'POST',
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(404);
    expect(data.error).toContain('Practice not found');
  });
});

