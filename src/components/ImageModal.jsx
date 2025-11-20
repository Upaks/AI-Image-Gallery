import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { X, Search, Download } from 'lucide-react'
import axios from 'axios'

export default function ImageModal({ image, user, onClose, onFindSimilar }) {
  const [metadata, setMetadata] = useState(image.image_metadata?.[0])
  const [similarImages, setSimilarImages] = useState([])
  const [loadingSimilar, setLoadingSimilar] = useState(false)

  useEffect(() => {
    // Refresh metadata periodically if processing
    if (metadata?.ai_processing_status === 'processing' || metadata?.ai_processing_status === 'pending') {
      const interval = setInterval(async () => {
        const { data } = await supabase
          .from('image_metadata')
          .select('*')
          .eq('image_id', image.id)
          .single()
        
        if (data) {
          setMetadata(data)
          if (data.ai_processing_status === 'completed') {
            clearInterval(interval)
          }
        }
      }, 2000)

      return () => clearInterval(interval)
    }
  }, [image.id, metadata?.ai_processing_status])

  const handleFindSimilar = async () => {
    setLoadingSimilar(true)
    try {
      const response = await axios.get(`/api/similar/${image.id}`, {
        params: { user_id: user.id, limit: 5 }
      })
      setSimilarImages(response.data.data || [])
      if (onFindSimilar) {
        onFindSimilar(image.id)
      }
    } catch (error) {
      console.error('Error finding similar images:', error)
    } finally {
      setLoadingSimilar(false)
    }
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = image.original_path
    link.download = image.filename
    link.click()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{image.filename}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Image */}
            <div>
              <img
                src={image.original_path}
                alt={image.filename}
                className="w-full rounded-lg"
              />
              <div className="mt-4 flex space-x-2">
                <button
                  onClick={handleDownload}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
                {metadata?.tags && metadata.tags.length > 0 && (
                  <button
                    onClick={handleFindSimilar}
                    disabled={loadingSimilar}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition disabled:opacity-50"
                  >
                    <Search className="w-4 h-4" />
                    <span>{loadingSimilar ? 'Finding...' : 'Find Similar'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="space-y-6">
              {/* Processing Status */}
              {metadata?.ai_processing_status === 'processing' || metadata?.ai_processing_status === 'pending' ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">AI is analyzing this image...</p>
                </div>
              ) : metadata?.ai_processing_status === 'failed' ? (
                <div className="text-center py-8">
                  <p className="text-red-600">AI processing failed. Please try again.</p>
                </div>
              ) : (
                <>
                  {/* Description */}
                  {metadata?.description && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
                      <p className="text-gray-600">{metadata.description}</p>
                    </div>
                  )}

                  {/* Tags */}
                  {metadata?.tags && metadata.tags.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {metadata.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Colors */}
                  {metadata?.colors && metadata.colors.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">Dominant Colors</h3>
                      <div className="flex gap-2">
                        {metadata.colors.map((color, idx) => (
                          <div key={idx} className="text-center">
                            <div
                              className="w-16 h-16 rounded-lg border-2 border-gray-200 mb-1"
                              style={{ backgroundColor: color }}
                            />
                            <p className="text-xs text-gray-600">{color}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upload Date */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Uploaded</h3>
                    <p className="text-gray-600">
                      {new Date(image.uploaded_at).toLocaleString()}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Similar Images */}
          {similarImages.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Similar Images</h3>
              <div className="grid grid-cols-5 gap-2">
                {similarImages.map((similar) => (
                  <img
                    key={similar.id}
                    src={similar.thumbnail_path || similar.original_path}
                    alt={similar.filename}
                    className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-75 transition"
                    onClick={() => {
                      // Update modal with similar image
                      window.location.reload() // Simple refresh, could be improved
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

