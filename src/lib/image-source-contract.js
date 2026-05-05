const IMAGE_SOURCE_TYPES = new Set(['none', 'url', 'gallery', 'ai'])

export const normalizeImageSourceText = (value, fallback = '', max = 120) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) return fallback
  return normalized.slice(0, max)
}

export const normalizeImageSourceType = (value, fallback = 'none') => {
  const normalized = normalizeImageSourceText(value, fallback, 40)
  return IMAGE_SOURCE_TYPES.has(normalized) ? normalized : fallback
}

export const normalizeHttpImageUrl = (value) => {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  try {
    const parsed = new URL(trimmed)
    const protocol = parsed.protocol.toLowerCase()
    if (protocol !== 'http:' && protocol !== 'https:') return ''
    return parsed.href
  } catch {
    return ''
  }
}

export const normalizeImageSource = (rawSource = {}, context = {}) => {
  const rawImage = rawSource.image && typeof rawSource.image === 'object' ? rawSource.image : rawSource
  const sourceType = normalizeImageSourceType(rawImage.imageSourceType || rawImage.sourceType)
  const galleryAssetId = normalizeImageSourceText(
    rawImage.imageGalleryAssetId || rawImage.galleryAssetId,
    '',
    140,
  )
  const url = normalizeHttpImageUrl(rawImage.imageUrl || rawImage.url)
  const prompt = normalizeImageSourceText(
    rawImage.imagePrompt || rawImage.prompt || context.prompt || rawSource.imageHint,
    '',
    240,
  )
  const alt = normalizeImageSourceText(
    rawImage.imageAlt || rawImage.alt || context.alt || rawSource.title || rawSource.name,
    '',
    120,
  )

  if (sourceType === 'gallery' && galleryAssetId) {
    return {
      sourceType: 'gallery',
      url: '',
      galleryAssetId,
      prompt,
      alt,
    }
  }
  if (sourceType === 'url' && url) {
    return {
      sourceType: 'url',
      url,
      galleryAssetId: '',
      prompt,
      alt,
    }
  }
  if (sourceType === 'ai') {
    return {
      sourceType: 'ai',
      url,
      galleryAssetId,
      prompt,
      alt,
    }
  }
  return {
    sourceType: 'none',
    url: '',
    galleryAssetId: '',
    prompt,
    alt,
  }
}
