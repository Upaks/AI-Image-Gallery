import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Upload, X, Check } from 'lucide-react'
import axios from 'axios'

export default function ImageUpload({ user, onUploadComplete }) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({})
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/') && (file.type.includes('jpeg') || file.type.includes('png'))
    )
    if (files.length > 0) {
      handleFiles(files)
    }
  }

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files).filter(file =>
      file.type.startsWith('image/') && (file.type.includes('jpeg') || file.type.includes('png'))
    )
    if (files.length > 0) {
      handleFiles(files)
    }
  }

  const handleFiles = async (files) => {
    setUploading(true)
    setError(null)
    
    try {
      for (const file of files) {
        try {
          await uploadFile(file)
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error)
          setError(`Failed to upload ${file.name}: ${error.message || error}`)
        }
      }
      
      // Refresh gallery after all uploads complete
      if (onUploadComplete) {
        onUploadComplete()
      }
    } catch (error) {
      console.error('Upload error:', error)
      setError(`Upload failed: ${error.message || error}`)
    } finally {
      setUploading(false)
      // Keep progress for a moment, then clear
      setTimeout(() => {
        setUploadProgress({})
      }, 2000)
    }
  }

  const uploadFile = async (file) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
    const thumbnailName = `${user.id}/thumbnails/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`

    // Upload original image
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) throw uploadError

    // Get public URL
    const { data: { publicUrl: originalUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(fileName)

    // Create thumbnail (client-side for now, or server-side)
    const thumbnail = await createThumbnail(file)
    
    // Upload thumbnail
    const { error: thumbError } = await supabase.storage
      .from('images')
      .upload(thumbnailName, thumbnail, {
        cacheControl: '3600',
        upsert: false
      })

    if (thumbError) throw thumbError

    const { data: { publicUrl: thumbnailUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(thumbnailName)

    // Insert image record
    const { data: imageData, error: dbError } = await supabase
      .from('images')
      .insert({
        user_id: user.id,
        filename: file.name,
        original_path: originalUrl,
        thumbnail_path: thumbnailUrl
      })
      .select()
      .single()

    if (dbError) throw dbError

    // Create metadata record with pending status
    await supabase
      .from('image_metadata')
      .insert({
        image_id: imageData.id,
        user_id: user.id,
        ai_processing_status: 'pending'
      })

    // Trigger AI processing in background (non-blocking)
    // If this fails, image is still uploaded and visible
    axios.post('/api/process-image', {
      image_id: imageData.id,
      user_id: user.id,
      image_url: originalUrl
    }).then(response => {
      console.log('AI processing started:', response.data)
    }).catch(error => {
      console.warn('AI processing failed to start (image still uploaded):', error.message)
      // Image is uploaded successfully, AI processing can be retried later
      // Status will remain 'pending'
    })

    setUploadProgress(prev => ({
      ...prev,
      [file.name]: 'completed'
    }))
  }

  const createThumbnail = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          const size = 300
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
            resolve(blob)
          }, 'image/jpeg', 0.85)
        }
        img.src = e.target.result
      }
      reader.readAsDataURL(file)
    })
  }

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        isDragging
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 bg-white hover:border-gray-400'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <div className="space-y-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Upload className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div>
          <p className="text-lg font-medium text-gray-900">
            {uploading ? 'Uploading images...' : 'Drag & drop images here'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            or click to select files (JPEG, PNG)
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {uploading ? 'Uploading...' : 'Select Images'}
        </button>

        {Object.keys(uploadProgress).length > 0 && (
          <div className="mt-4 space-y-2">
            {Object.entries(uploadProgress).map(([filename, status]) => (
              <div key={filename} className="flex items-center justify-center space-x-2 text-sm">
                {status === 'completed' ? (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-green-600">{filename}</span>
                  </>
                ) : (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-gray-600">{filename}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

