/**
 * Storage adapter interface
 * Abstracts file storage to support local, S3, GCS, etc.
 */

export interface StorageObject {
  key: string
  size: number
  contentType?: string
  metadata?: Record<string, string>
  url?: string
}

export interface StorageAdapter {
  /**
   * Upload a file
   */
  upload(
    key: string,
    data: Buffer | string,
    options?: {
      contentType?: string
      metadata?: Record<string, string>
    }
  ): Promise<StorageObject>

  /**
   * Download a file
   */
  download(key: string): Promise<Buffer>

  /**
   * Get a signed URL for temporary access
   */
  getSignedUrl(key: string, expiresIn?: number): Promise<string>

  /**
   * Delete a file
   */
  delete(key: string): Promise<void>

  /**
   * List files with prefix
   */
  list(prefix: string): Promise<StorageObject[]>

  /**
   * Check if file exists
   */
  exists(key: string): Promise<boolean>
}

/**
 * Local filesystem storage implementation
 */
import fs from 'fs/promises'
import path from 'path'

export class LocalStorageAdapter implements StorageAdapter {
  constructor(private basePath: string = './storage') {}

  async upload(
    key: string,
    data: Buffer | string,
    options?: {
      contentType?: string
      metadata?: Record<string, string>
    }
  ): Promise<StorageObject> {
    const fullPath = path.join(this.basePath, key)
    const dir = path.dirname(fullPath)

    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true })

    // Write file
    await fs.writeFile(fullPath, data)

    // Get stats
    const stats = await fs.stat(fullPath)

    return {
      key,
      size: stats.size,
      contentType: options?.contentType,
      metadata: options?.metadata,
      url: `file://${fullPath}`,
    }
  }

  async download(key: string): Promise<Buffer> {
    const fullPath = path.join(this.basePath, key)
    return await fs.readFile(fullPath)
  }

  async getSignedUrl(key: string, expiresIn?: number): Promise<string> {
    // For local storage, just return the file path
    const fullPath = path.join(this.basePath, key)
    return `file://${fullPath}`
  }

  async delete(key: string): Promise<void> {
    const fullPath = path.join(this.basePath, key)
    await fs.unlink(fullPath)
  }

  async list(prefix: string): Promise<StorageObject[]> {
    const fullPath = path.join(this.basePath, prefix)
    const files: StorageObject[] = []

    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.isFile()) {
          const filePath = path.join(fullPath, entry.name)
          const stats = await fs.stat(filePath)
          const key = path.join(prefix, entry.name)

          files.push({
            key,
            size: stats.size,
            url: `file://${filePath}`,
          })
        }
      }
    } catch (error) {
      // Directory doesn't exist
      return []
    }

    return files
  }

  async exists(key: string): Promise<boolean> {
    const fullPath = path.join(this.basePath, key)
    try {
      await fs.access(fullPath)
      return true
    } catch {
      return false
    }
  }
}

/**
 * S3-compatible storage adapter (stub)
 */
export class S3StorageAdapter implements StorageAdapter {
  constructor(
    private config: {
      bucket: string
      region: string
      accessKeyId?: string
      secretAccessKey?: string
    }
  ) {}

  async upload(
    key: string,
    data: Buffer | string,
    options?: {
      contentType?: string
      metadata?: Record<string, string>
    }
  ): Promise<StorageObject> {
    // TODO: Implement S3 upload using AWS SDK
    throw new Error('S3 adapter not implemented')
  }

  async download(key: string): Promise<Buffer> {
    throw new Error('S3 adapter not implemented')
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    throw new Error('S3 adapter not implemented')
  }

  async delete(key: string): Promise<void> {
    throw new Error('S3 adapter not implemented')
  }

  async list(prefix: string): Promise<StorageObject[]> {
    throw new Error('S3 adapter not implemented')
  }

  async exists(key: string): Promise<boolean> {
    throw new Error('S3 adapter not implemented')
  }
}
