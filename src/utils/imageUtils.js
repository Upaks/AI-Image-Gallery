/**
 * Image utility functions for thumbnail generation and validation
 */

/**
 * Create a thumbnail from an image file
 * @param {File} file - The image file to create thumbnail from
 * @param {number} size - The size of the thumbnail (default: 300)
 * @returns {Promise<Blob>} - Promise that resolves to the thumbnail blob
 */
export const createThumbnail = (file, size = 300) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const img = new Image()
      
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        canvas.width = size
        canvas.height = size
        
        // Calculate dimensions to maintain aspect ratio
        let width = img.width
        let height = img.height
        if (width > height) {
          height = (height / width) * size
          width = size
        } else {
          width = (width / height) * size
          height = size
        }
        
        const x = (size - width) / 2
        const y = (size - height) / 2
        
        ctx.drawImage(img, x, y, width, height)
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to create thumbnail blob'))
          }
        }, 'image/jpeg', 0.85)
      }
      
      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }
      
      img.src = e.target.result
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    
    reader.readAsDataURL(file)
  })
}

/**
 * Validate if a file is a supported image format
 * @param {File} file - The file to validate
 * @returns {boolean} - True if file is a valid image format
 */
export const isValidImageFormat = (file) => {
  const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png']
  return supportedTypes.includes(file.type)
}

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size string
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Generate a unique filename
 * @param {string} userId - User ID
 * @param {string} originalFilename - Original filename
 * @param {string} prefix - Optional prefix (e.g., 'thumbnails')
 * @returns {string} - Unique filename
 */
export const generateUniqueFilename = (userId, originalFilename, prefix = '') => {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(7)
  const ext = originalFilename.split('.').pop()
  const path = prefix ? `${userId}/${prefix}/` : `${userId}/`
  return `${path}${timestamp}_${random}.${ext}`
}

