import { useState, useEffect, useRef } from 'react'
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
  const pollingIntervalRef = useRef(null)
  const imagesRef = useRef([])
  const limit = 20

  // Keep imagesRef in sync with images state
  useEffect(() => {
    imagesRef.current = images
  }, [images])

  useEffect(() => {
    loadImages()
  }, [user, searchQuery, colorFilter, page])

  // Function to update a specific image's metadata in the images state
  const updateImageMetadata = (imageId, newMetadata) => {
    setImages(prevImages => {
      const updated = prevImages.map(img => {
        if (img.id === imageId) {
          return {
            ...img,
            image_metadata: [newMetadata]
          }
        }
        return img
      })
      imagesRef.current = updated // Update ref immediately
      return updated
    })
  }

  // Poll for AI processing updates continuously
  // This runs once on mount and keeps checking for pending images
  useEffect(() => {
    // Don't start polling if already running
    if (pollingIntervalRef.current) {
      return
    }

    // Start polling - this runs continuously and checks latest state
    pollingIntervalRef.current = setInterval(async () => {
      try {
        // Always get latest images from ref (always current, not stale closure)
        const currentImages = imagesRef.current
        
        // Find pending images from LATEST state
        // Only include images that don't have metadata data yet AND are processing/pending
        const pendingImageIds = currentImages
          .filter(img => {
            const metadata = img.image_metadata?.[0]
            const hasData = metadata && (
              (metadata.tags && metadata.tags.length > 0) ||
              (metadata.description && metadata.description.trim().length > 0) ||
              (metadata.colors && metadata.colors.length > 0)
            )
            
            // Only process if no data exists AND status is processing/pending
            if (hasData) return false
            
            const status = metadata?.ai_processing_status
            return status === 'processing' || status === 'pending' || !status
          })
          .map(img => img.id)

        // If no pending images, just skip this poll (but keep polling running)
        if (pendingImageIds.length === 0) {
          return
        }

        // Fetch updated metadata for pending images
        const { data: metadataUpdates, error } = await supabase
          .from('image_metadata')
          .select('*')
          .in('image_id', pendingImageIds)

        if (error) {
          console.error('Error fetching metadata updates:', error)
          return
        }

        if (metadataUpdates && metadataUpdates.length > 0) {
          // Update images state with new metadata
          setImages(prevImages => {
            const updated = prevImages.map(img => {
              const updatedMetadata = metadataUpdates.find(m => m.image_id === img.id)
              if (updatedMetadata) {
                return {
                  ...img,
                  image_metadata: [updatedMetadata]
                }
              }
              return img
            })

            // Update ref immediately so next poll has latest state
            imagesRef.current = updated

            return updated
          })
        }
      } catch (error) {
        console.error('Error polling for updates:', error)
      }
    }, 2000) // Poll every 2 seconds

    // Cleanup: stop polling only on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, []) // Only run once on mount - polling runs continuously

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
        const imagesData = data || []
        setImages(imagesData)
        imagesRef.current = imagesData // Update ref immediately
      } else {
        setImages(prev => {
          const updated = [...prev, ...(data || [])]
          imagesRef.current = updated // Update ref immediately
          return updated
        })
      }

      setHasMore((data || []).length === limit)
    } catch (error) {
      console.error('Error loading images:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImageUploaded = () => {
    // Simply reload images without messing with page state
    // This ensures metadata is properly loaded with the images
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Image Gallery</h1>
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
              <div key={i} className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No images found</h3>
            <p className="text-gray-600 dark:text-gray-400">
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
                  className="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
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
          image={images.find(img => img.id === selectedImage.id) || selectedImage}
          user={user}
          onClose={() => setSelectedImage(null)}
          onFindSimilar={handleFindSimilar}
          onMetadataUpdate={updateImageMetadata}
        />
      )}
    </div>
  )
}

