import { describe, it, expect } from 'vitest'
import {
  filterBySearchQuery,
  filterByColor,
  cosineSimilarity,
  extractUniqueTags,
} from '../../utils/searchUtils'

describe('searchUtils', () => {
  const mockMetadata = [
    {
      id: 1,
      tags: ['soldier', 'military', 'uniform'],
      description: 'A soldier in uniform',
      colors: ['#a08060', '#c0e0e0'],
    },
    {
      id: 2,
      tags: ['nature', 'landscape', 'mountain'],
      description: 'Beautiful mountain landscape',
      colors: ['#806040', '#90a0b0'],
    },
    {
      id: 3,
      tags: ['soldier', 'portrait', 'photo'],
      description: 'Portrait photo of a soldier',
      colors: ['#a08060', '#c0e0e0', '#ffffff'],
    },
  ]

  describe('filterBySearchQuery', () => {
    it('should filter by tags', () => {
      const results = filterBySearchQuery(mockMetadata, 'soldier')
      expect(results).toHaveLength(2)
      expect(results[0].id).toBe(1)
      expect(results[1].id).toBe(3)
    })

    it('should filter by description', () => {
      const results = filterBySearchQuery(mockMetadata, 'mountain')
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe(2)
    })

    it('should be case insensitive', () => {
      const results = filterBySearchQuery(mockMetadata, 'SOLDIER')
      expect(results).toHaveLength(2)
    })

    it('should match partial words', () => {
      const results = filterBySearchQuery(mockMetadata, 'land')
      expect(results).toHaveLength(1)
      expect(results[0].description).toContain('landscape')
    })

    it('should return empty array for no matches', () => {
      const results = filterBySearchQuery(mockMetadata, 'nonexistent')
      expect(results).toHaveLength(0)
    })

    it('should return all metadata for empty query', () => {
      const results = filterBySearchQuery(mockMetadata, '')
      expect(results).toHaveLength(3)
    })

    it('should handle null or undefined metadata', () => {
      expect(filterBySearchQuery(null, 'soldier')).toEqual([])
      expect(filterBySearchQuery(undefined, 'soldier')).toEqual([])
    })

    it('should handle metadata without tags or description', () => {
      const metadata = [{ id: 1 }]
      const results = filterBySearchQuery(metadata, 'test')
      expect(results).toHaveLength(0)
    })
  })

  describe('filterByColor', () => {
    it('should filter by exact color match', () => {
      const results = filterByColor(mockMetadata, '#a08060')
      expect(results).toHaveLength(2)
      expect(results[0].id).toBe(1)
      expect(results[1].id).toBe(3)
    })

    it('should return empty array for no matches', () => {
      const results = filterByColor(mockMetadata, '#000000')
      expect(results).toHaveLength(0)
    })

    it('should return all metadata for empty color', () => {
      const results = filterByColor(mockMetadata, '')
      expect(results).toHaveLength(3)
    })

    it('should handle null or undefined metadata', () => {
      expect(filterByColor(null, '#a08060')).toEqual([])
      expect(filterByColor(undefined, '#a08060')).toEqual([])
    })

    it('should handle metadata without colors array', () => {
      const metadata = [{ id: 1, colors: null }]
      const results = filterByColor(metadata, '#a08060')
      expect(results).toHaveLength(0)
    })
  })

  describe('cosineSimilarity', () => {
    it('should calculate cosine similarity correctly', () => {
      const vec1 = [1, 2, 3]
      const vec2 = [1, 2, 3]
      expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(1.0, 5)
    })

    it('should return 0 for orthogonal vectors', () => {
      const vec1 = [1, 0]
      const vec2 = [0, 1]
      expect(cosineSimilarity(vec1, vec2)).toBe(0)
    })

    it('should return 0 for different length vectors', () => {
      const vec1 = [1, 2, 3]
      const vec2 = [1, 2]
      expect(cosineSimilarity(vec1, vec2)).toBe(0)
    })

    it('should handle zero vectors', () => {
      const vec1 = [0, 0, 0]
      const vec2 = [1, 2, 3]
      expect(cosineSimilarity(vec1, vec2)).toBe(0)
    })

    it('should handle negative values', () => {
      const vec1 = [-1, -2, -3]
      const vec2 = [-1, -2, -3]
      expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(1.0, 5)
    })

    it('should return 0 for null or undefined vectors', () => {
      expect(cosineSimilarity(null, [1, 2, 3])).toBe(0)
      expect(cosineSimilarity([1, 2, 3], undefined)).toBe(0)
    })
  })

  describe('extractUniqueTags', () => {
    it('should extract unique tags from metadata', () => {
      const tags = extractUniqueTags(mockMetadata)
      expect(tags).toContain('soldier')
      expect(tags).toContain('military')
      expect(tags).toContain('nature')
      expect(tags).toContain('portrait')
    })

    it('should be case insensitive (convert to lowercase)', () => {
      const metadata = [
        { tags: ['Soldier', 'SOLDIER', 'soldier'] },
        { tags: ['Nature', 'nature'] },
      ]
      const tags = extractUniqueTags(metadata)
      expect(tags).toHaveLength(2)
      expect(tags).toContain('soldier')
      expect(tags).toContain('nature')
    })

    it('should return empty array for empty metadata', () => {
      expect(extractUniqueTags([])).toEqual([])
    })

    it('should handle null or undefined metadata', () => {
      expect(extractUniqueTags(null)).toEqual([])
      expect(extractUniqueTags(undefined)).toEqual([])
    })

    it('should handle metadata without tags', () => {
      const metadata = [{ id: 1 }, { id: 2, tags: null }]
      const tags = extractUniqueTags(metadata)
      expect(tags).toEqual([])
    })

    it('should ignore empty tags', () => {
      const metadata = [
        { tags: ['soldier', '', 'nature', null, undefined] },
      ]
      const tags = extractUniqueTags(metadata)
      expect(tags.length).toBe(2)
      expect(tags).toContain('soldier')
      expect(tags).toContain('nature')
      expect(tags).not.toContain('')
      expect(tags).not.toContain(null)
      expect(tags).not.toContain(undefined)
    })
  })
})

