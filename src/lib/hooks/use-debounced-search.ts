import { useState, useEffect } from 'react'

export function useDebouncedSearch(initialValue: string = '', delay: number = 300) {
  const [value, setValue] = useState(initialValue)
  const [debouncedValue, setDebouncedValue] = useState(initialValue)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(timer)
  }, [value, delay])

  return {
    value,
    debouncedValue,
    setValue,
    isDebouncing: value !== debouncedValue
  }
}

