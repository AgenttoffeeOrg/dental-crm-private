import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    
    // Create call activities for specific deals that are missing them
    const callActivities = [
      {
        // Sarah Johnson - Teeth Whitening Consultation deal
        tenant_id: '550e8400-e29b-41d4-a716-446655440000',
        type: 'call',
        direction: 'inbound',
        contact_id: '550e8400-e29b-41d4-a716-446655440020', // Sarah Johnson
        deal_id: '550e8400-e29b-41d4-a716-446655440030', // Teeth Whitening deal
        agent_user_id: '713f98d6-f983-4869-b39e-54a219514ecd', // Valid user ID
        subject: 'Teeth Whitening Consultation Call',
        snippet: 'Patient called to discuss teeth whitening options and pricing.',
        occurred_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
      },
      {
        // Emma Wilson - Invisalign Treatment deal  
        tenant_id: '550e8400-e29b-41d4-a716-446655440000',
        type: 'call',
        direction: 'inbound', 
        contact_id: '550e8400-e29b-41d4-a716-446655440022', // Emma Wilson
        deal_id: '550e8400-e29b-41d4-a716-446655440032', // Invisalign deal
        agent_user_id: '713f98d6-f983-4869-b39e-54a219514ecd', // Valid user ID
        subject: 'Invisalign Consultation Call',
        snippet: 'Patient called to discuss Invisalign treatment process and timeline.',
        occurred_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() // 3 hours ago
      }
    ]

    const { data: newActivities, error } = await supabase
      .from('activities')
      .insert(callActivities)
      .select()

    if (error) {
      console.error('Failed to create call activities:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Call activities created for deals',
      data: {
        activitiesCreated: newActivities?.length || 0,
        activities: newActivities
      }
    })
  } catch (error) {
    console.error('API route error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
