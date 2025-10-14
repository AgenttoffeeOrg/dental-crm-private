import { useEffect } from 'react'
import { realtimeService } from '../realtime-service'
import { useTenant } from './use-tenant'

export function useRealtimeDeals(onUpdate: () => void) {
  const { tenantId } = useTenant()

  useEffect(() => {
    if (!tenantId) return

    const unsubscribe = realtimeService.subscribeToDeals(tenantId, (payload) => {
      console.log('Deal updated:', payload)
      onUpdate()
    })

    return () => unsubscribe()
  }, [tenantId, onUpdate])
}


