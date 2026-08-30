/**
 * Client-Side Image Compression & Downscaling for Vision AI OCR
 * Downscales phone camera photos (typically 4MB-15MB) to optimal OCR resolution (~150KB-350KB)
 * to avoid Vercel 4.5MB Serverless Payload limits while preserving high-contrast text clarity.
 */
export async function compressImageForVision(
  file: File,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.82
): Promise<{ fileBase64: string; mimeType: string }> {
  // If not an image (e.g. PDF), convert directly
  if (!file.type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        resolve({
          fileBase64: reader.result as string,
          mimeType: file.type,
        })
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string

      img.onload = () => {
        let width = img.width
        let height = img.height

        // Calculate aspect ratio downscaling if larger than max bounds
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          } else {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          // Fallback to raw base64 if canvas context is unavailable
          resolve({
            fileBase64: event.target?.result as string,
            mimeType: file.type,
          })
          return
        }

        // Draw image onto canvas with high quality smoothing
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, width, height)

        // Export as compressed JPEG
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality)
        resolve({
          fileBase64: compressedBase64,
          mimeType: 'image/jpeg',
        })
      }

      img.onerror = () => {
        resolve({
          fileBase64: event.target?.result as string,
          mimeType: file.type,
        })
      }
    }
    reader.onerror = reject
  })
}
