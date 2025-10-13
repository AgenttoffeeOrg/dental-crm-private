// Prevent duplicate API requests

class RequestDeduplicator {
  private pending = new Map<string, Promise<any>>()

  async dedupe<T>(key: string, request: () => Promise<T>): Promise<T> {
    // If request is already pending, return existing promise
    if (this.pending.has(key)) {
      return this.pending.get(key)!
    }

    // Start new request
    const promise = request().finally(() => {
      this.pending.delete(key)
    })

    this.pending.set(key, promise)
    return promise
  }

  clear(key?: string) {
    if (key) {
      this.pending.delete(key)
    } else {
      this.pending.clear()
    }
  }
}

export const requestDeduplicator = new RequestDeduplicator()

