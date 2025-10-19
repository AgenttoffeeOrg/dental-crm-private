/**
 * =====================================================
 * ROUTING ENGINE UNIT TESTS
 * =====================================================
 * Version: 1.0.0
 * Date: October 19, 2025
 * Phase: 15 - Testing & Quality Assurance
 * =====================================================
 * 
 * PURPOSE:
 * Comprehensive unit tests for the routing engine to ensure
 * all routing methods work correctly with high precision.
 * 
 * COVERAGE:
 * - User override routing
 * - Tag mapping routing
 * - AI keyword matching
 * - Unsorted fallback
 * - Edge cases and error handling
 * 
 * TEST FRAMEWORK: Jest/Vitest
 * 
 * =====================================================
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { routeDealToPipeline, getTenantRoutingSettings, getTreatmentTags, getPipelineMappings } from '@/lib/treatment-routing/routing-engine'
import type { RoutingContext } from '@/lib/treatment-routing/routing-engine'

// Mock Supabase client
vi.mock('@/lib/supabase-client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              single: vi.fn()
            }))
          }))
        })),
        in: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn()
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    }))
  }))
}))

describe('Routing Engine - Unit Tests', () => {
  const MOCK_TENANT_ID = '00000000-0000-0000-0000-000000000001'
  const MOCK_CONTACT_ID = '00000000-0000-0000-0000-000000000002'
  const MOCK_USER_ID = '00000000-0000-0000-0000-000000000003'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // =====================================================
  // TASK 15.1: TEST ROUTING METHODS
  // =====================================================

  describe('Task 15.1: routeDealToPipeline() - All Routing Methods', () => {
    
    it('should route via USER_OVERRIDE when existingPipelineId is provided', async () => {
      // Arrange
      const context: RoutingContext = {
        tenantId: MOCK_TENANT_ID,
        treatmentTags: ['dental_implant'],
        dealTitle: 'Test Deal',
        contactId: MOCK_CONTACT_ID,
        existingPipelineId: 'pipeline-123',
        existingStageId: 'stage-456',
        userId: MOCK_USER_ID
      }

      // Mock the supabase response
      const mockSupabase = require('@/lib/supabase-client').createClient()
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { id: 'pipeline-123', name: 'Manual Pipeline' },
        error: null
      })
      mockSupabase.from().select().eq().order().limit().single.mockResolvedValueOnce({
        data: { id: 'stage-456', name: 'First Stage' },
        error: null
      })
      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: { id: 'log-123' },
        error: null
      })

      // Act
      const result = await routeDealToPipeline(context)

      // Assert
      expect(result.routingMethod).toBe('user_override')
      expect(result.pipelineId).toBe('pipeline-123')
      expect(result.stageId).toBe('stage-456')
      expect(result.confidence).toBe(100) // User override always has 100% confidence
      expect(result.reason).toContain('User manually selected pipeline')
    })

    it('should route via TAG_MAPPING when treatment tags match pipeline mapping', async () => {
      // Arrange
      const context: RoutingContext = {
        tenantId: MOCK_TENANT_ID,
        treatmentTags: ['dental_implant', 'bone_graft'],
        dealTitle: 'Implant Consultation',
        contactId: MOCK_CONTACT_ID,
        userId: MOCK_USER_ID
      }

      // Mock routing settings
      const mockSupabase = require('@/lib/supabase-client').createClient()
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          routing_enabled: true,
          unsorted_pipeline_id: 'unsorted-pipeline',
          default_stage_id: 'unsorted-stage'
        },
        error: null
      })

      // Mock treatment tags
      mockSupabase.from().select().eq().mockResolvedValueOnce({
        data: [
          { id: 'tag-1', name: 'dental_implant', keywords: ['implant', 'dental implant'] },
          { id: 'tag-2', name: 'bone_graft', keywords: ['bone graft', 'grafting'] }
        ],
        error: null
      })

      // Mock pipeline mappings
      mockSupabase.from().select().in().eq().order.mockResolvedValueOnce({
        data: [
          {
            treatment_tag_id: 'tag-1',
            pipeline_id: 'high-value-pipeline',
            stage_id: 'consultation-stage',
            priority: 1,
            treatment_tag: { name: 'dental_implant' },
            pipeline: { name: 'High-Value Pipeline' },
            stage: { name: 'Consultation' }
          }
        ],
        error: null
      })

      // Mock logging
      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: { id: 'log-456' },
        error: null
      })

      // Act
      const result = await routeDealToPipeline(context)

      // Assert
      expect(result.routingMethod).toBe('tag_mapping')
      expect(result.pipelineId).toBe('high-value-pipeline')
      expect(result.stageId).toBe('consultation-stage')
      expect(result.matchedTagNames).toContain('dental_implant')
      expect(result.confidence).toBeGreaterThanOrEqual(90) // High confidence for exact tag match
      expect(result.reason).toContain('Matched treatment tag')
    })

    it('should route via AI_KEYWORD when no tag mapping but keywords match', async () => {
      // Arrange
      const context: RoutingContext = {
        tenantId: MOCK_TENANT_ID,
        treatmentTags: [], // No explicit tags
        dealTitle: 'Patient needs dental implants urgently',
        dealDescription: 'Full arch reconstruction with bone grafting required',
        contactId: MOCK_CONTACT_ID,
        userId: MOCK_USER_ID
      }

      // Mock routing settings
      const mockSupabase = require('@/lib/supabase-client').createClient()
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          routing_enabled: true,
          unsorted_pipeline_id: 'unsorted-pipeline',
          default_stage_id: 'unsorted-stage'
        },
        error: null
      })

      // Mock treatment tags with keywords
      mockSupabase.from().select().eq().mockResolvedValueOnce({
        data: [
          { id: 'tag-1', name: 'dental_implant', keywords: ['implant', 'dental implant', 'implants'] },
          { id: 'tag-2', name: 'bone_graft', keywords: ['bone graft', 'grafting', 'bone grafting'] }
        ],
        error: null
      })

      // Mock pipeline mappings (empty for this test)
      mockSupabase.from().select().in().eq().order.mockResolvedValueOnce({
        data: [],
        error: null
      })

      // Mock pipeline mappings for keyword-matched tags
      mockSupabase.from().select().in().eq().order.mockResolvedValueOnce({
        data: [
          {
            treatment_tag_id: 'tag-1',
            pipeline_id: 'high-value-pipeline',
            stage_id: 'consultation-stage',
            priority: 1,
            treatment_tag: { name: 'dental_implant' },
            pipeline: { name: 'High-Value Pipeline' },
            stage: { name: 'Consultation' }
          }
        ],
        error: null
      })

      // Mock logging
      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: { id: 'log-789' },
        error: null
      })

      // Act
      const result = await routeDealToPipeline(context)

      // Assert
      expect(result.routingMethod).toBe('ai_keyword')
      expect(result.pipelineId).toBe('high-value-pipeline')
      expect(result.confidence).toBeGreaterThan(0)
      expect(result.confidence).toBeLessThan(90) // Lower confidence than exact tag match
      expect(result.reason).toContain('keyword')
    })

    it('should route to UNSORTED_FALLBACK when no matches found', async () => {
      // Arrange
      const context: RoutingContext = {
        tenantId: MOCK_TENANT_ID,
        treatmentTags: [],
        dealTitle: 'Generic inquiry',
        contactId: MOCK_CONTACT_ID,
        userId: MOCK_USER_ID
      }

      // Mock routing settings
      const mockSupabase = require('@/lib/supabase-client').createClient()
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          routing_enabled: true,
          unsorted_pipeline_id: 'unsorted-pipeline-123',
          default_stage_id: 'unsorted-stage-456'
        },
        error: null
      })

      // Mock treatment tags (empty)
      mockSupabase.from().select().eq().mockResolvedValueOnce({
        data: [],
        error: null
      })

      // Mock pipeline name
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { id: 'unsorted-pipeline-123', name: 'Unsorted' },
        error: null
      })

      // Mock stage name
      mockSupabase.from().select().eq().order().limit().single.mockResolvedValueOnce({
        data: { id: 'unsorted-stage-456', name: 'New' },
        error: null
      })

      // Mock logging
      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: { id: 'log-unsorted' },
        error: null
      })

      // Act
      const result = await routeDealToPipeline(context)

      // Assert
      expect(result.routingMethod).toBe('unsorted_fallback')
      expect(result.pipelineId).toBe('unsorted-pipeline-123')
      expect(result.stageId).toBe('unsorted-stage-456')
      expect(result.confidence).toBe(0) // No confidence for fallback
      expect(result.reason).toContain('No matching')
    })
  })

  // =====================================================
  // EDGE CASES & ERROR HANDLING
  // =====================================================

  describe('Edge Cases & Error Handling', () => {
    
    it('should handle missing tenant gracefully', async () => {
      // Arrange
      const context: RoutingContext = {
        tenantId: 'non-existent-tenant',
        treatmentTags: [],
        dealTitle: 'Test',
        contactId: MOCK_CONTACT_ID
      }

      const mockSupabase = require('@/lib/supabase-client').createClient()
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Tenant not found' }
      })

      // Act & Assert
      await expect(routeDealToPipeline(context)).rejects.toThrow()
    })

    it('should handle empty treatment tags array', async () => {
      // Arrange
      const context: RoutingContext = {
        tenantId: MOCK_TENANT_ID,
        treatmentTags: [], // Explicitly empty
        dealTitle: 'Test Deal',
        contactId: MOCK_CONTACT_ID
      }

      const mockSupabase = require('@/lib/supabase-client').createClient()
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          routing_enabled: true,
          unsorted_pipeline_id: 'unsorted-pipeline',
          default_stage_id: 'unsorted-stage'
        },
        error: null
      })

      mockSupabase.from().select().eq().mockResolvedValueOnce({
        data: [],
        error: null
      })

      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { id: 'unsorted-pipeline', name: 'Unsorted' },
        error: null
      })

      mockSupabase.from().select().eq().order().limit().single.mockResolvedValueOnce({
        data: { id: 'unsorted-stage', name: 'New' },
        error: null
      })

      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: { id: 'log-empty' },
        error: null
      })

      // Act
      const result = await routeDealToPipeline(context)

      // Assert
      expect(result).toBeDefined()
      expect(result.routingMethod).toBe('unsorted_fallback')
    })

    it('should handle multiple matching tags and use highest priority', async () => {
      // Arrange
      const context: RoutingContext = {
        tenantId: MOCK_TENANT_ID,
        treatmentTags: ['dental_implant', 'crown', 'whitening'],
        dealTitle: 'Multiple treatments needed',
        contactId: MOCK_CONTACT_ID
      }

      const mockSupabase = require('@/lib/supabase-client').createClient()
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          routing_enabled: true,
          unsorted_pipeline_id: 'unsorted-pipeline',
          default_stage_id: 'unsorted-stage'
        },
        error: null
      })

      mockSupabase.from().select().eq().mockResolvedValueOnce({
        data: [
          { id: 'tag-1', name: 'dental_implant', keywords: ['implant'] },
          { id: 'tag-2', name: 'crown', keywords: ['crown'] },
          { id: 'tag-3', name: 'whitening', keywords: ['whitening'] }
        ],
        error: null
      })

      // Mock multiple pipeline mappings with different priorities
      mockSupabase.from().select().in().eq().order.mockResolvedValueOnce({
        data: [
          {
            treatment_tag_id: 'tag-1',
            pipeline_id: 'high-value-pipeline',
            stage_id: 'consultation-stage',
            priority: 1, // Highest priority
            treatment_tag: { name: 'dental_implant' },
            pipeline: { name: 'High-Value Pipeline' },
            stage: { name: 'Consultation' }
          },
          {
            treatment_tag_id: 'tag-2',
            pipeline_id: 'general-pipeline',
            stage_id: 'new-stage',
            priority: 2, // Lower priority
            treatment_tag: { name: 'crown' },
            pipeline: { name: 'General Pipeline' },
            stage: { name: 'New' }
          },
          {
            treatment_tag_id: 'tag-3',
            pipeline_id: 'cosmetic-pipeline',
            stage_id: 'consult-stage',
            priority: 3, // Lowest priority
            treatment_tag: { name: 'whitening' },
            pipeline: { name: 'Cosmetic Pipeline' },
            stage: { name: 'Consultation' }
          }
        ],
        error: null
      })

      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: { id: 'log-multi' },
        error: null
      })

      // Act
      const result = await routeDealToPipeline(context)

      // Assert
      expect(result.pipelineId).toBe('high-value-pipeline') // Highest priority
      expect(result.matchedTagNames).toContain('dental_implant')
    })

    it('should handle very long deal titles and descriptions', async () => {
      // Arrange
      const longTitle = 'A'.repeat(500)
      const longDescription = 'B'.repeat(2000)
      
      const context: RoutingContext = {
        tenantId: MOCK_TENANT_ID,
        treatmentTags: [],
        dealTitle: longTitle,
        dealDescription: longDescription,
        contactId: MOCK_CONTACT_ID
      }

      const mockSupabase = require('@/lib/supabase-client').createClient()
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          routing_enabled: true,
          unsorted_pipeline_id: 'unsorted-pipeline',
          default_stage_id: 'unsorted-stage'
        },
        error: null
      })

      mockSupabase.from().select().eq().mockResolvedValueOnce({
        data: [],
        error: null
      })

      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { id: 'unsorted-pipeline', name: 'Unsorted' },
        error: null
      })

      mockSupabase.from().select().eq().order().limit().single.mockResolvedValueOnce({
        data: { id: 'unsorted-stage', name: 'New' },
        error: null
      })

      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: { id: 'log-long' },
        error: null
      })

      // Act & Assert - Should not throw
      const result = await routeDealToPipeline(context)
      expect(result).toBeDefined()
    })

    it('should handle special characters in deal title and tags', async () => {
      // Arrange
      const context: RoutingContext = {
        tenantId: MOCK_TENANT_ID,
        treatmentTags: ['tag-with-dashes', 'tag_with_underscores', "tag'with'quotes"],
        dealTitle: "Deal with special chars: @#$%^&*()",
        contactId: MOCK_CONTACT_ID
      }

      const mockSupabase = require('@/lib/supabase-client').createClient()
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          routing_enabled: true,
          unsorted_pipeline_id: 'unsorted-pipeline',
          default_stage_id: 'unsorted-stage'
        },
        error: null
      })

      mockSupabase.from().select().eq().mockResolvedValueOnce({
        data: [],
        error: null
      })

      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { id: 'unsorted-pipeline', name: 'Unsorted' },
        error: null
      })

      mockSupabase.from().select().eq().order().limit().single.mockResolvedValueOnce({
        data: { id: 'unsorted-stage', name: 'New' },
        error: null
      })

      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: { id: 'log-special' },
        error: null
      })

      // Act & Assert - Should not throw
      const result = await routeDealToPipeline(context)
      expect(result).toBeDefined()
    })
  })

  // =====================================================
  // PERFORMANCE TESTS
  // =====================================================

  describe('Performance Tests', () => {
    
    it('should complete routing in less than 2 seconds', async () => {
      // Arrange
      const context: RoutingContext = {
        tenantId: MOCK_TENANT_ID,
        treatmentTags: ['dental_implant'],
        dealTitle: 'Performance Test',
        contactId: MOCK_CONTACT_ID
      }

      const mockSupabase = require('@/lib/supabase-client').createClient()
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          routing_enabled: true,
          unsorted_pipeline_id: 'unsorted-pipeline',
          default_stage_id: 'unsorted-stage'
        },
        error: null
      })

      mockSupabase.from().select().eq().mockResolvedValueOnce({
        data: [{ id: 'tag-1', name: 'dental_implant', keywords: ['implant'] }],
        error: null
      })

      mockSupabase.from().select().in().eq().order.mockResolvedValueOnce({
        data: [{
          treatment_tag_id: 'tag-1',
          pipeline_id: 'high-value-pipeline',
          stage_id: 'consultation-stage',
          priority: 1,
          treatment_tag: { name: 'dental_implant' },
          pipeline: { name: 'High-Value Pipeline' },
          stage: { name: 'Consultation' }
        }],
        error: null
      })

      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: { id: 'log-perf' },
        error: null
      })

      // Act
      const startTime = Date.now()
      await routeDealToPipeline(context)
      const duration = Date.now() - startTime

      // Assert
      expect(duration).toBeLessThan(2000) // Less than 2 seconds
    })
  })
})

export {} // Make this a module

