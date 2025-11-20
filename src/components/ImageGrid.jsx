import { Search } from 'lucide-react'

export default function ImageGrid({ images, onImageClick, onColorClick, onFindSimilar, selectedColor }) {
  // Note: ImageGrid no longer needs to poll - parent Gallery component handles it
  // This component just displays the images with their current status

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {images.map((image) => {
        // Get metadata - handle both array and direct object  
        const metadataArray = image.image_metadata || []
        const metadata = Array.isArray(metadataArray) && metadataArray.length > 0 
          ? metadataArray[0] 
          : null
        
        // Get status from metadata - this is the source of truth
        const status = metadata?.ai_processing_status
        
        // SIMPLE RULE: Only show processing if we EXPLICITLY know it's processing
        // Default to NOT showing processing - better safe than sorry
        const isProcessing = status === 'processing' || status === 'pending'
        
        // If status is 'completed' or 'failed', isProcessing will be false (correct)
        // If status is undefined/null, isProcessing will be false (don't assume processing)
        // If metadata has data but no status, isProcessing will be false (data means completed)

        return (
          <div
            key={image.id}
            className="group relative aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden cursor-pointer hover:shadow-lg dark:hover:shadow-gray-800 transition-shadow"
            onClick={() => onImageClick(image)}
          >
            <img
              src={image.thumbnail_path || image.original_path}
              alt={image.filename}
              className="w-full h-full object-cover"
            />
            
            {/* Processing overlay */}
            {isProcessing && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-white text-xs">Processing...</p>
                </div>
              </div>
            )}

            {/* Tags preview */}
            {metadata && metadata.tags && metadata.tags.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex flex-wrap gap-1">
                  {metadata.tags.slice(0, 3).map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-white/20 text-white px-2 py-1 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Color indicators */}
            {metadata && metadata.colors && metadata.colors.length > 0 && (
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {metadata.colors.slice(0, 3).map((color, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation()
                      onColorClick(color)
                    }}
                    className={`w-4 h-4 rounded-full border-2 ${
                      selectedColor === color ? 'border-white dark:border-gray-200 ring-2 ring-blue-500 dark:ring-blue-400' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    style={{ backgroundColor: color }}
                    title={`Filter by ${color}`}
                  />
                ))}
              </div>
            )}

            {/* Find similar button */}
            {metadata && metadata.tags && metadata.tags.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onFindSimilar(image.id)
                }}
                className="absolute top-2 left-2 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 px-2 py-1 rounded text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1"
              >
                <Search className="w-3 h-3" />
                <span>Similar</span>
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

