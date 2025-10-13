import { useState, useTransition } from 'react'

export function useOptimisticUpdate<T>(
  initialData: T,
  updateFn: (data: T) => Promise<T>
) {
  const [data, setData] = useState(initialData)
  const [isPending, startTransition] = useTransition()

  const update = async (optimisticData: T) => {
    // Optimistically update UI immediately
    setData(optimisticData)

    startTransition(async () => {
      try {
        // Perform actual update
        const result = await updateFn(optimisticData)
        setData(result)
      } catch (error) {
        // Revert on error
        setData(initialData)
        throw error
      }
    })
  }

  return { data, isPending, update }
}

