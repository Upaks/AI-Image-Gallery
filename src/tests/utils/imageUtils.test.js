import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createThumbnail,
  isValidImageFormat,
  formatFileSize,
  generateUniqueFilename,
} from '../../utils/imageUtils'

describe('imageUtils', () => {
  describe('isValidImageFormat', () => {
    it('should return true for valid JPEG files', () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' })
      expect(isValidImageFormat(file)).toBe(true)
    })

    it('should return true for valid PNG files', () => {
      const file = new File([''], 'test.png', { type: 'image/png' })
      expect(isValidImageFormat(file)).toBe(true)
    })

    it('should return false for invalid file types', () => {
      const file = new File([''], 'test.pdf', { type: 'application/pdf' })
      expect(isValidImageFormat(file)).toBe(false)
    })

    it('should return false for GIF files (not supported)', () => {
      const file = new File([''], 'test.gif', { type: 'image/gif' })
      expect(isValidImageFormat(file)).toBe(false)
    })
  })

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes')
      expect(formatFileSize(500)).toBe('500 Bytes')
      expect(formatFileSize(1024)).toBe('1 KB')
      expect(formatFileSize(2048)).toBe('2 KB')
      expect(formatFileSize(1048576)).toBe('1 MB')
      expect(formatFileSize(1073741824)).toBe('1 GB')
    })

    it('should handle large file sizes', () => {
      const size = formatFileSize(5368709120) // 5 GB
      expect(size).toContain('GB')
    })
  })

  describe('generateUniqueFilename', () => {
    it('should generate unique filename with user ID', () => {
      const filename = generateUniqueFilename('user123', 'image.jpg')
      expect(filename).toContain('user123')
      expect(filename).toContain('.jpg')
      expect(filename).toMatch(/user123\/\d+_[a-z0-9]+\.jpg/)
    })

    it('should include prefix in path when provided', () => {
      const filename = generateUniqueFilename('user123', 'image.png', 'thumbnails')
      expect(filename).toContain('user123/thumbnails/')
      expect(filename).toContain('.png')
    })

    it('should handle different file extensions', () => {
      const jpg = generateUniqueFilename('user123', 'test.jpg')
      const png = generateUniqueFilename('user123', 'test.png')
      
      expect(jpg).toContain('.jpg')
      expect(png).toContain('.png')
    })

    it('should generate different filenames on each call', () => {
      const filename1 = generateUniqueFilename('user123', 'image.jpg')
      const filename2 = generateUniqueFilename('user123', 'image.jpg')
      
      // Should be different due to timestamp and random string
      expect(filename1).not.toBe(filename2)
    })
  })

  describe('createThumbnail', () => {
    beforeEach(() => {
      // Mock HTMLImageElement and FileReader
      global.Image = vi.fn(() => {
        const img = {
          width: 800,
          height: 600,
          onload: null,
          onerror: null,
          src: '',
        }
        setTimeout(() => {
          if (img.onload) img.onload()
        }, 0)
        return img
      })

      global.FileReader = vi.fn(() => {
        const reader = {
          readAsDataURL: vi.fn(function(file) {
            setTimeout(() => {
              if (this.onload) {
                this.onload({ target: { result: 'data:image/jpeg;base64,...' } })
              }
            }, 0)
          }),
          onload: null,
          onerror: null,
        }
        return reader
      })

      // Mock canvas
      global.HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
        drawImage: vi.fn(),
      }))

      global.HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
        const blob = new Blob([''], { type: 'image/jpeg' })
        callback(blob)
      })
    })

    it('should create thumbnail blob from image file', async () => {
      const file = new File(['image data'], 'test.jpg', { type: 'image/jpeg' })
      
      const blob = await createThumbnail(file, 300)
      
      expect(blob).toBeInstanceOf(Blob)
      expect(blob.type).toBe('image/jpeg')
    })

    it('should handle errors gracefully', async () => {
      global.Image = vi.fn(() => {
        const img = {
          width: 800,
          height: 600,
          onload: null,
          onerror: null,
          src: '',
        }
        setTimeout(() => {
          if (img.onerror) img.onerror()
        }, 0)
        return img
      })

      const file = new File(['image data'], 'test.jpg', { type: 'image/jpeg' })
      
      await expect(createThumbnail(file)).rejects.toThrow('Failed to load image')
    })
  })
})

