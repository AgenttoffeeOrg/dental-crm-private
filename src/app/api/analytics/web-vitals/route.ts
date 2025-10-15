/**
 * API Route: Web Vitals Analytics
 * Collects and stores Web Vitals metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

interface WebVitalsPayload {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get user session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const payload: WebVitalsPayload = await request.json();

    // Validate payload
    if (!payload.name || typeof payload.value !== 'number') {
      return NextResponse.json(
        { error: 'Invalid payload' },
        { status: 400 }
      );
    }

    // Store in database (optional - can also send to external analytics)
    const { error } = await supabase
      .from('web_vitals_metrics')
      .insert({
        user_id: user.id,
        metric_name: payload.name,
        metric_value: payload.value,
        rating: payload.rating,
        delta: payload.delta,
        metric_id: payload.id,
        page_url: request.headers.get('referer') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Failed to store web vitals:', error);
      // Don't fail the request - analytics should be non-blocking
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Web vitals API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

