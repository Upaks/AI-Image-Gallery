import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import ImageUpload from '../components/ImageUpload'
import ImageGrid from '../components/ImageGrid'
import SearchBar from '../components/SearchBar'
import UserMenu from '../components/UserMenu'
import ImageModal from '../components/ImageModal'
import { Image as ImageIcon } from 'lucide-react'

export default function Gallery({ user }) {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [colorFilter, setColorFilter] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const limit = 20

  useEffect(() => {
    loadImages()
  }, [user, searchQuery, colorFilter, page])

  const loadImages = async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('images')
        .select('*, image_metadata(*)')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1)

      // Apply search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase()
        const { data: metadata } = await supabase
          .from('image_metadata')
          .select('image_id, tags, description')
          .eq('user_id', user.id)

        if (metadata) {
          // Filter metadata that matches search query
          const matchingMetadata = metadata.filter(meta => {
            // Check if search query is in tags array
            const tagMatch = meta.tags && meta.tags.some(tag => 
              tag.toLowerCase().includes(searchLower)
            )
            // Check if search query is in description
            const descMatch = meta.description && 
              meta.description.toLowerCase().includes(searchLower)
            return tagMatch || descMatch
          })

          if (matchingMetadata.length > 0) {
            const imageIds = matchingMetadata.map(m => m.image_id)
            query = query.in('id', imageIds)
          } else {
            setImages([])
            setHasMore(false)
            setLoading(false)
            return
          }
        } else {
          setImages([])
          setHasMore(false)
          setLoading(false)
          return
        }
      }

      // Apply color filter
      if (colorFilter) {
        const { data: metadata } = await supabase
          .from('image_metadata')
          .select('image_id')
          .eq('user_id', user.id)
          .contains('colors', [colorFilter])

        if (metadata && metadata.length > 0) {
          const imageIds = metadata.map(m => m.image_id)
          query = query.in('id', imageIds)
        } else {
          setImages([])
          setHasMore(false)
          setLoading(false)
          return
        }
      }

      const { data, error } = await query

      if (error) throw error

      if (page === 1) {
        setImages(data || [])
      } else {
        setImages(prev => [...prev, ...(data || [])])
      }

      setHasMore((data || []).length === limit)
    } catch (error) {
      console.error('Error loading images:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImageUploaded = () => {
    // Force refresh by resetting page if already 1
    if (page === 1) {
      // Force re-fetch by toggling a dependency
      setPage(0)
      setTimeout(() => setPage(1), 0)
    } else {
      setPage(1)
    }
    // Also manually reload images
    loadImages()
  }

  const handleSearch = (query) => {
    setSearchQuery(query)
    setPage(1)
  }

  const handleColorFilter = (color) => {
    setColorFilter(color === colorFilter ? null : color)
    setPage(1)
  }

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1)
    }
  }

  const handleFindSimilar = async (imageId) => {
    try {
      const response = await fetch(`/api/similar/${imageId}?user_id=${user.id}`)
      const { data } = await response.json()
      
      if (data && data.length > 0) {
        setImages(data)
        setPage(1)
        setHasMore(false)
      }
    } catch (error) {
      console.error('Error finding similar images:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">AI Image Gallery</h1>
            </div>
            <UserMenu user={user} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-6">
          <SearchBar onSearch={handleSearch} />
        </div>

        {/* Upload Zone */}
        <div className="mb-8">
          <ImageUpload user={user} onUploadComplete={handleImageUploaded} />
        </div>

        {/* Gallery */}
        {loading && images.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="aspect-square bg-gray-200 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No images found</h3>
            <p className="text-gray-600">
              {searchQuery || colorFilter
                ? 'Try adjusting your search or filters'
                : 'Upload your first image to get started'}
            </p>
          </div>
        ) : (
          <>
            <ImageGrid
              images={images}
              onImageClick={setSelectedImage}
              onColorClick={handleColorFilter}
              onFindSimilar={handleFindSimilar}
              selectedColor={colorFilter}
            />
            {hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Image Modal */}
      {selectedImage && (
        <ImageModal
          image={selectedImage}
          user={user}
          onClose={() => setSelectedImage(null)}
          onFindSimilar={handleFindSimilar}
        />
      )}
    </div>
  )
}

