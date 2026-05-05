import { sanitizeAvatarUrl } from './avatar'
import { normalizeImageSource } from './image-source-contract'

export const normalizeAvatarImageSourceForDisplay = (
  avatarImage = {},
  legacyAvatar = '',
  fallbackAlt = 'Avatar',
) => {
  const normalized = normalizeImageSource(avatarImage, { alt: fallbackAlt })
  if (normalized.sourceType !== 'none') return normalized

  const legacyUrl = sanitizeAvatarUrl(legacyAvatar)
  if (!legacyUrl) return normalized

  return normalizeImageSource(
    {
      imageSourceType: 'url',
      imageUrl: legacyUrl,
    },
    { alt: fallbackAlt },
  )
}

export const getAvatarImageGalleryAssetId = (avatarImage = {}, legacyAvatar = '', fallbackAlt = 'Avatar') => {
  const normalized = normalizeAvatarImageSourceForDisplay(avatarImage, legacyAvatar, fallbackAlt)
  return normalized.sourceType === 'gallery' ? normalized.galleryAssetId : ''
}

export const resolveAvatarImageSourceUrl = ({
  galleryStore,
  previewMap = {},
  avatarImage = {},
  legacyAvatar = '',
  fallbackAlt = 'Avatar',
} = {}) => {
  const normalized = normalizeAvatarImageSourceForDisplay(avatarImage, legacyAvatar, fallbackAlt)

  if (normalized.sourceType === 'url') {
    return sanitizeAvatarUrl(normalized.url)
  }

  if (normalized.sourceType === 'gallery' && normalized.galleryAssetId) {
    const asset = galleryStore?.findAssetById?.(normalized.galleryAssetId)
    if (asset?.sourceType === 'url' && asset.sourceUrl) return sanitizeAvatarUrl(asset.sourceUrl)
    return previewMap?.[normalized.galleryAssetId] || ''
  }

  return sanitizeAvatarUrl(legacyAvatar)
}
