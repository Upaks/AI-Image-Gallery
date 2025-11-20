/**
 * Search and filter utility functions
 */

/**
 * Filter metadata by search query
 * @param {Array} metadata - Array of metadata objects
 * @param {string} query - Search query string
 * @returns {Array} - Filtered metadata array
 */
export const filterBySearchQuery = (metadata, query) => {
  if (!query || !metadata || metadata.length === 0) {
    return metadata || []
  }

  const searchLower = query.toLowerCase()
  
  return metadata.filter(meta => {
    // Check if search query is in tags array
    const tagMatch = meta.tags && 
      Array.isArray(meta.tags) && 
      meta.tags.some(tag => tag.toLowerCase().includes(searchLower))
    
    // Check if search query is in description
    const descMatch = meta.description && 
      meta.description.toLowerCase().includes(searchLower)
    
    return tagMatch || descMatch
  })
}

/**
 * Filter metadata by color
 * @param {Array} metadata - Array of metadata objects
 * @param {string} color - Color hex code to filter by
 * @returns {Array} - Filtered metadata array
 */
export const filterByColor = (metadata, color) => {
  if (!color || !metadata || metadata.length === 0) {
    return metadata || []
  }

  return metadata.filter(meta => {
    return meta.colors && 
      Array.isArray(meta.colors) && 
      meta.colors.includes(color)
  })
}

/**
 * Calculate cosine similarity between two arrays
 * @param {Array} vec1 - First vector
 * @param {Array} vec2 - Second vector
 * @returns {number} - Similarity score between 0 and 1
 */
export const cosineSimilarity = (vec1, vec2) => {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) {
    return 0
  }

  let dotProduct = 0
  let norm1 = 0
  let norm2 = 0

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i]
    norm1 += vec1[i] * vec1[i]
    norm2 += vec2[i] * vec2[i]
  }

  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2)
  if (denominator === 0) return 0

  return dotProduct / denominator
}

/**
 * Extract unique tags from metadata array
 * @param {Array} metadata - Array of metadata objects
 * @returns {Array} - Array of unique tags
 */
export const extractUniqueTags = (metadata) => {
  if (!metadata || metadata.length === 0) {
    return []
  }

  const tagsSet = new Set()
  
  metadata.forEach(meta => {
    if (meta.tags && Array.isArray(meta.tags)) {
      meta.tags.forEach(tag => {
        // Only add non-null, non-empty tags
        if (tag && typeof tag === 'string' && tag.trim().length > 0) {
          tagsSet.add(tag.toLowerCase())
        }
      })
    }
  })

  return Array.from(tagsSet)
}

