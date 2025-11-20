import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { X, Search, Download, Edit2, Plus, Save } from 'lucide-react'
import axios from 'axios'
import { logDebug, logError } from '../utils/logger'

export default function ImageModal({ image, user, onClose, onFindSimilar, onMetadataUpdate }) {
  const [metadata, setMetadata] = useState(image.image_metadata?.[0])
  const [similarImages, setSimilarImages] = useState([])
  const [loadingSimilar, setLoadingSimilar] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [editingTags, setEditingTags] = useState(false)
  const [editedTags, setEditedTags] = useState([])
  const [newTag, setNewTag] = useState('')
  const [savingTags, setSavingTags] = useState(false)
  const intervalRef = useRef(null)

  // Always fetch fresh metadata on mount and when image changes
  const fetchMetadata = async () => {
    const { data, error } = await supabase
      .from('image_metadata')
      .select('*')
      .eq('image_id', image.id)
      .single()
    
    if (data && !error) {
      setMetadata(data)
      // Immediately update parent component's state when metadata is fetched/updated
      if (onMetadataUpdate) {
        onMetadataUpdate(image.id, data)
      }
      return data
    }
    return null
  }

  useEffect(() => {
    // Fetch fresh metadata immediately when modal opens
    const setupPolling = async () => {
      // Clear any existing interval first
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }

      const fetchedMetadata = await fetchMetadata()
      const status = fetchedMetadata?.ai_processing_status || metadata?.ai_processing_status || image.image_metadata?.[0]?.ai_processing_status
      
      // If processing or pending, start polling
      if (status === 'processing' || status === 'pending') {
        intervalRef.current = setInterval(async () => {
          const updatedMetadata = await fetchMetadata()
          
          if (updatedMetadata) {
            // fetchMetadata already updates parent, but explicitly ensure it's synced
            // Stop polling when processing is complete
            if (updatedMetadata.ai_processing_status === 'completed' || updatedMetadata.ai_processing_status === 'failed') {
              if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
              }
            }
          }
        }, 2000) // Poll every 2 seconds
      }
    }

    setupPolling()

    // Cleanup on unmount or when image.id changes
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [image.id]) // Only depend on image.id

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
      logError('Error finding similar images', error, { imageId: image.id })
    } finally {
      setLoadingSimilar(false)
    }
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      // Fetch the image as a blob to handle CORS issues
      const response = await fetch(image.original_path)
      if (!response.ok) {
        throw new Error('Failed to fetch image')
      }
      const blob = await response.blob()
      
      // Create object URL from blob
      const blobUrl = window.URL.createObjectURL(blob)
      
      // Create download link
    const link = document.createElement('a')
      link.href = blobUrl
    link.download = image.filename
      document.body.appendChild(link)
    link.click()
      
      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    } catch (error) {
      logError('Error downloading image', error, { imageId: image.id, filename: image.filename })
      // Fallback: open in new tab if download fails
      window.open(image.original_path, '_blank')
    } finally {
      setDownloading(false)
    }
  }

  const handleEditTags = () => {
    // Initialize editedTags with current tags when entering edit mode
    const currentTags = metadata?.tags && Array.isArray(metadata.tags) ? [...metadata.tags] : []
    setEditedTags(currentTags)
    setEditingTags(true)
    logDebug('Entering tag edit mode', { tagCount: currentTags.length })
  }

  const handleCancelEdit = () => {
    setEditingTags(false)
    setEditedTags([])
    setNewTag('')
  }

  const handleRemoveTag = (indexToRemove) => {
    setEditedTags(prevTags => {
      const updated = prevTags.filter((_, idx) => idx !== indexToRemove)
      logDebug('Tag removed', { remainingTags: updated.length })
      return updated
    })
  }

  const handleAddTag = () => {
    const trimmedTag = newTag.trim().toLowerCase()
    if (trimmedTag && !editedTags.map(t => t.toLowerCase()).includes(trimmedTag)) {
      setEditedTags(prevTags => {
        const updated = [...prevTags, trimmedTag]
        logDebug('Tag added', { tag: trimmedTag, totalTags: updated.length })
        return updated
      })
      setNewTag('')
      // Auto-focus back to input for better UX
      setTimeout(() => {
        const input = document.querySelector('input[placeholder="Add new tag..."]')
        if (input) input.focus()
      }, 0)
    } else if (trimmedTag) {
      // Tag already exists - provide feedback
      alert('This tag already exists')
    }
  }

  const handleSaveTags = async () => {
    if (!metadata) return
    
    setSavingTags(true)
    
    try {
      // Ensure editedTags is an array
      const tagsToSave = Array.isArray(editedTags) ? [...editedTags] : []
      
      logDebug('Saving tags', { imageId: image.id, tagCount: tagsToSave.length })
      
      // Update metadata in database
      const { data, error } = await supabase
        .from('image_metadata')
        .update({ tags: tagsToSave })
        .eq('image_id', image.id)
        .select()
        .single()

      if (error) {
        logError('Failed to save tags to database', error, { imageId: image.id })
        throw error
      }

      if (!data) {
        throw new Error('No data returned from update')
      }

      // Update local state with fresh data from database
      setMetadata(data)
      
      // Update parent component
      if (onMetadataUpdate) {
        onMetadataUpdate(image.id, data)
      }

      setEditingTags(false)
      setNewTag('')
    } catch (error) {
      logError('Error saving tags', error, { imageId: image.id })
      alert(`Failed to save tags: ${error.message || 'Please try again.'}`)
    } finally {
      setSavingTags(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 dark:bg-opacity-80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{image.filename}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
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
                  disabled={downloading}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  <span>{downloading ? 'Downloading...' : 'Download'}</span>
                </button>
                {metadata?.tags && metadata.tags.length > 0 && (
                  <button
                    onClick={handleFindSimilar}
                    disabled={loadingSimilar}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition disabled:opacity-50"
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
                  <div className="w-12 h-12 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">AI is analyzing this image...</p>
                </div>
              ) : metadata?.ai_processing_status === 'failed' ? (
                <div className="text-center py-8">
                  <p className="text-red-600 dark:text-red-400">AI processing failed. Please try again.</p>
                </div>
              ) : (
                <>
                  {/* Description */}
                  {metadata?.description && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</h3>
                      <p className="text-gray-600 dark:text-gray-400">{metadata.description}</p>
                    </div>
                  )}

                  {/* Tags */}
                    <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tags</h3>
                      {!editingTags && (
                        <button
                          onClick={handleEditTags}
                          className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      )}
                    </div>
                    
                    {editingTags ? (
                      <div className="space-y-3">
                        {/* Editable tags */}
                        <div className="flex flex-wrap gap-2">
                          {editedTags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm"
                            >
                              <span>{tag}</span>
                              <button
                                onClick={() => handleRemoveTag(idx)}
                                className="ml-1 hover:text-red-600"
                                type="button"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                        
                        {/* Add new tag */}
                        <div className="space-y-2">
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              value={newTag}
                              onChange={(e) => setNewTag(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  handleAddTag()
                                }
                              }}
                              placeholder="Type tag and press Enter or click +"
                              className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                              autoFocus
                            />
                            <button
                              onClick={handleAddTag}
                              disabled={!newTag.trim()}
                              type="button"
                              className="px-4 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                              title="Add tag"
                            >
                              <Plus className="w-4 h-4" />
                              <span className="text-sm">Add</span>
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Tip: Type a tag and press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Enter</kbd> or click <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Add</kbd> to add it to the list above, then click <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Save</kbd> when done
                          </p>
                        </div>
                        
                        {/* Save/Cancel buttons */}
                        <div className="flex space-x-2">
                          <button
                            onClick={handleSaveTags}
                            disabled={savingTags}
                            type="button"
                            className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm"
                          >
                            <Save className="w-3 h-3" />
                            <span>{savingTags ? 'Saving...' : 'Save'}</span>
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={savingTags}
                            type="button"
                            className="flex items-center space-x-1 px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition disabled:opacity-50 text-sm"
                          >
                            <X className="w-3 h-3" />
                            <span>Cancel</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      Array.isArray(metadata?.tags) && metadata.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {metadata.tags.map((tag, idx) => (
                          <span
                            key={idx}
                              className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No tags yet. Click Edit to add tags.</p>
                      )
                    )}
                    </div>

                  {/* Colors */}
                  {metadata?.colors && metadata.colors.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Dominant Colors</h3>
                      <div className="flex gap-2">
                        {metadata.colors.map((color, idx) => (
                          <div key={idx} className="text-center">
                            <div
                              className="w-16 h-16 rounded-lg border-2 border-gray-200 dark:border-gray-600 mb-1"
                              style={{ backgroundColor: color }}
                            />
                            <p className="text-xs text-gray-600 dark:text-gray-400">{color}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upload Date */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Uploaded</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {new Date(image.uploaded_at).toLocaleString()}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Similar Images */}
          {similarImages.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Similar Images</h3>
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

