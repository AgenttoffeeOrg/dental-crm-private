import { createClient } from './supabase-client'

export class StorageService {
  private supabase = createClient()

  /**
   * Upload a file to Supabase Storage
   */
  async uploadFile(
    bucket: string,
    path: string,
    file: File | ArrayBuffer | Uint8Array,
    options?: {
      contentType?: string
      metadata?: Record<string, unknown>
    }
  ) {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .upload(path, file, {
          contentType: options?.contentType,
          metadata: options?.metadata,
          upsert: false,
        })

      if (error) {
        throw new Error(`Upload failed: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('StorageService.uploadFile error:', error)
      throw error
    }
  }

  /**
   * Get a signed URL for a file (for secure access to private files)
   */
  async getSignedUrl(bucket: string, path: string, expiresIn = 3600) {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn)

      if (error) {
        throw new Error(`Failed to get signed URL: ${error.message}`)
      }

      return data.signedUrl
    } catch (error) {
      console.error('StorageService.getSignedUrl error:', error)
      throw error
    }
  }

  /**
   * Get a public URL for a file (only works for public buckets)
   */
  getPublicUrl(bucket: string, path: string) {
    const { data } = this.supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(bucket: string, path: string) {
    try {
      const { error } = await this.supabase.storage.from(bucket).remove([path])

      if (error) {
        throw new Error(`Delete failed: ${error.message}`)
      }

      return true
    } catch (error) {
      console.error('StorageService.deleteFile error:', error)
      throw error
    }
  }

  /**
   * Upload an attachment and return storage path
   */
  async uploadAttachment(file: File, tenantId: string) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const path = `${tenantId}/attachments/${fileName}`

    await this.uploadFile('attachments', path, file, {
      contentType: file.type,
    })

    return path
  }

  /**
   * Get signed URL for audio file
   */
  async getAudioUrl(path: string) {
    return this.getSignedUrl('audio', path, 3600) // 1 hour expiry
  }

  /**
   * Get signed URL for attachment
   */
  async getAttachmentUrl(path: string) {
    return this.getSignedUrl('attachments', path, 3600) // 1 hour expiry
  }
}

// Export singleton instance
export const storageService = new StorageService()
