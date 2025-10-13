import { useMemo } from 'react'

export function useInstantSearch<T>(
  items: T[],
  searchTerm: string,
  searchFields: (keyof T)[]
) {
  return useMemo(() => {
    if (!searchTerm) return items

    const lowerSearch = searchTerm.toLowerCase()

    return items.filter(item =>
      searchFields.some(field => {
        const value = item[field]
        if (typeof value === 'string') {
          return value.toLowerCase().includes(lowerSearch)
        }
        return false
      })
    )
  }, [items, searchTerm, searchFields])
}

