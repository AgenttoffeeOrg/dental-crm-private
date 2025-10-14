import { useEffect, useRef } from 'react'
import { debounce } from 'lodash'

export function useAutoSave(
  data: any,
  onSave: (data: any) => Promise<void>,
  delay: number = 2000
) {
  const debouncedSave = useRef(
    debounce(async (value: any) => {
      try {
        await onSave(value)
      } catch (error) {
        console.error('Auto-save failed:', error)
      }
    }, delay)
  ).current

  useEffect(() => {
    if (data) {
      debouncedSave(data)
    }
    return () => debouncedSave.cancel()
  }, [data, debouncedSave])
}


