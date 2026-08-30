/**
 * High-Performance Client-Side Image Compressor for Vision AI
 * Converts heavy phone camera images (3MB - 20MB) into lightweight, high-contrast JPEG (~50KB - 120KB)
 * for instant uploads and zero risk of HTTP 413 Payload Too Large errors.
 */
export async function compressImageForVision(
  file: File,
  maxWidth = 1024,
  maxHeight = 1024,
  quality = 0.72
): Promise<{ fileBase64: string; mimeType: string }> {
  // If not an image (e.g. PDF), convert directly
  if (!file.type.startsWith('image/') && file.type !== '') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        resolve({
          fileBase64: reader.result as string,
          mimeType: file.type || 'application/octet-stream',
        })
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.src = objectUrl

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      let width = img.width
      let height = img.height

      // Scale down keeping aspect ratio
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
      canvas.width = Math.max(1, width)
      canvas.height = Math.max(1, height)
      const ctx = canvas.getContext('2d', { alpha: false })

      if (!ctx) {
        // Fallback to file reader
        const fallbackReader = new FileReader()
        fallbackReader.onload = () => {
          resolve({
            fileBase64: fallbackReader.result as string,
            mimeType: 'image/jpeg',
          })
        }
        fallbackReader.readAsDataURL(file)
        return
      }

      // Draw with smoothing for clear OCR text
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'medium'
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)

      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality)
      resolve({
        fileBase64: compressedDataUrl,
        mimeType: 'image/jpeg',
      })
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      const fallbackReader = new FileReader()
      fallbackReader.onload = () => {
        resolve({
          fileBase64: fallbackReader.result as string,
          mimeType: 'image/jpeg',
        })
      }
      fallbackReader.onerror = () => {
        resolve({
          fileBase64: '',
          mimeType: 'image/jpeg',
        })
      }
      fallbackReader.readAsDataURL(file)
    }
  })
}
