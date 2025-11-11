-- =====================================================
-- Migration: Seat Management Functions
-- Purpose: Atomic operations for seat counting
-- Safety: Prevents race conditions in concurrent seat reservations
-- =====================================================

BEGIN;

-- =====================================================
-- 1. INCREMENT ACTIVE SEATS (atomic)
-- =====================================================

CREATE OR REPLACE FUNCTION increment_active_seats(
  p_tenant_id UUID,
  p_count INTEGER DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
  v_subscription_id UUID;
  v_current_seats INTEGER;
  v_seat_limit INTEGER;
  v_new_seats INTEGER;
BEGIN
  -- Get subscription with row-level lock
  SELECT id, active_seats, seat_limit
  INTO v_subscription_id, v_current_seats, v_seat_limit
  FROM subscriptions
  WHERE tenant_id = p_tenant_id
    AND status IN ('active', 'trialing')
  FOR UPDATE; -- Lock row for atomic operation
  
  IF v_subscription_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'No active subscription found'
    );
  END IF;
  
  v_new_seats := v_current_seats + p_count;
  
  -- Check if would exceed limit
  IF v_new_seats > v_seat_limit THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', format('Would exceed seat limit (%s/%s)', v_new_seats, v_seat_limit),
      'current_seats', v_current_seats,
      'seat_limit', v_seat_limit
    );
  END IF;
  
  -- Update seat count
  UPDATE subscriptions
  SET 
    active_seats = v_new_seats,
    updated_at = NOW()
  WHERE id = v_subscription_id;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'previous_seats', v_current_seats,
    'new_seats', v_new_seats,
    'available_seats', v_seat_limit - v_new_seats
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION increment_active_seats IS 
  'Atomically reserve seats with limit enforcement (prevents race conditions)';

-- =====================================================
-- 2. DECREMENT ACTIVE SEATS (atomic)
-- =====================================================

CREATE OR REPLACE FUNCTION decrement_active_seats(
  p_tenant_id UUID,
  p_count INTEGER DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
  v_subscription_id UUID;
  v_current_seats INTEGER;
  v_new_seats INTEGER;
BEGIN
  -- Get subscription with row-level lock
  SELECT id, active_seats
  INTO v_subscription_id, v_current_seats
  FROM subscriptions
  WHERE tenant_id = p_tenant_id
  FOR UPDATE;
  
  IF v_subscription_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'No subscription found'
    );
  END IF;
  
  -- Calculate new seats (don't go below 0)
  v_new_seats := GREATEST(0, v_current_seats - p_count);
  
  -- Update seat count
  UPDATE subscriptions
  SET 
    active_seats = v_new_seats,
    updated_at = NOW()
  WHERE id = v_subscription_id;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'previous_seats', v_current_seats,
    'new_seats', v_new_seats,
    'released_seats', v_current_seats - v_new_seats
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION decrement_active_seats IS 
  'Atomically release seats (prevents negative counts)';

-- =====================================================
-- 3. CHECK SEAT AVAILABILITY (read-only, no lock)
-- =====================================================

CREATE OR REPLACE FUNCTION check_seat_availability(
  p_tenant_id UUID,
  p_seats_needed INTEGER DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
  v_subscription RECORD;
  v_available_seats INTEGER;
BEGIN
  SELECT 
    id,
    active_seats,
    seat_limit,
    status
  INTO v_subscription
  FROM subscriptions
  WHERE tenant_id = p_tenant_id
  LIMIT 1;
  
  IF v_subscription.id IS NULL THEN
    RETURN jsonb_build_object(
      'available', FALSE,
      'reason', 'No subscription found'
    );
  END IF;
  
  IF v_subscription.status NOT IN ('active', 'trialing') THEN
    RETURN jsonb_build_object(
      'available', FALSE,
      'reason', format('Subscription is %s', v_subscription.status)
    );
  END IF;
  
  v_available_seats := v_subscription.seat_limit - v_subscription.active_seats;
  
  IF v_available_seats < p_seats_needed THEN
    RETURN jsonb_build_object(
      'available', FALSE,
      'reason', format('Not enough seats (need %s, have %s)', p_seats_needed, v_available_seats),
      'available_seats', v_available_seats,
      'needed_seats', p_seats_needed
    );
  END IF;
  
  RETURN jsonb_build_object(
    'available', TRUE,
    'available_seats', v_available_seats,
    'seat_limit', v_subscription.seat_limit,
    'active_seats', v_subscription.active_seats
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION check_seat_availability IS 
  'Check if seats are available without locking (fast read)';

-- =====================================================
-- 4. SYNC SEAT COUNT (maintenance)
-- =====================================================

CREATE OR REPLACE FUNCTION sync_subscription_seat_count(
  p_tenant_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_subscription_id UUID;
  v_actual_count INTEGER;
  v_recorded_count INTEGER;
BEGIN
  -- Count actual app_users
  SELECT COUNT(*) INTO v_actual_count
  FROM app_users
  WHERE tenant_id = p_tenant_id;
  
  -- Get subscription
  SELECT id, active_seats
  INTO v_subscription_id, v_recorded_count
  FROM subscriptions
  WHERE tenant_id = p_tenant_id
  LIMIT 1;
  
  IF v_subscription_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'No subscription found'
    );
  END IF;
  
  -- Update if mismatch
  IF v_actual_count != v_recorded_count THEN
    UPDATE subscriptions
    SET 
      active_seats = v_actual_count,
      updated_at = NOW()
    WHERE id = v_subscription_id;
    
    RETURN jsonb_build_object(
      'success', TRUE,
      'synced', TRUE,
      'previous_count', v_recorded_count,
      'actual_count', v_actual_count,
      'difference', v_actual_count - v_recorded_count
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'synced', FALSE,
    'message', 'Count already in sync',
    'count', v_actual_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION sync_subscription_seat_count IS 
  'Sync subscription seat count with actual user count (maintenance)';

-- =====================================================
-- 5. BULK SYNC ALL SUBSCRIPTIONS (cron job)
-- =====================================================

CREATE OR REPLACE FUNCTION sync_all_subscription_seat_counts()
RETURNS TABLE (
  tenant_id UUID,
  recorded_seats INTEGER,
  actual_seats INTEGER,
  difference INTEGER,
  synced BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH actual_counts AS (
    SELECT 
      au.tenant_id,
      COUNT(*) AS actual_count
    FROM app_users au
    GROUP BY au.tenant_id
  )
  UPDATE subscriptions s
  SET 
    active_seats = COALESCE(ac.actual_count, 0),
    updated_at = NOW()
  FROM actual_counts ac
  WHERE s.tenant_id = ac.tenant_id
    AND s.active_seats != COALESCE(ac.actual_count, 0)
  RETURNING 
    s.tenant_id,
    s.active_seats AS recorded_seats,
    COALESCE(ac.actual_count, 0) AS actual_seats,
    COALESCE(ac.actual_count, 0) - s.active_seats AS difference,
    TRUE AS synced;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION sync_all_subscription_seat_counts IS 
  'Sync all subscription seat counts (run daily via cron)';

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 009 complete: Seat management functions created';
  RAISE NOTICE '⚛️  Atomic operations: increment_active_seats, decrement_active_seats';
  RAISE NOTICE '🔍 Read functions: check_seat_availability';
  RAISE NOTICE '🔧 Maintenance: sync_subscription_seat_count, sync_all_subscription_seat_counts';
END $$;

