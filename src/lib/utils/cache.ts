// Simple in-memory cache for API responses

interface CacheEntry<T> {
  data: T
  timestamp: number
}

class Cache {
  private store = new Map<string, CacheEntry<any>>()
  private ttl: number

  constructor(ttlMinutes: number = 5) {
    this.ttl = ttlMinutes * 60 * 1000
  }

  set<T>(key: string, data: T): void {
    this.store.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key)
    if (!entry) return null

    if (Date.now() - entry.timestamp > this.ttl) {
      this.store.delete(key)
      return null
    }

    return entry.data
  }

  clear(): void {
    this.store.clear()
  }

  invalidate(key: string): void {
    this.store.delete(key)
  }
}

export const apiCache = new Cache(5)


