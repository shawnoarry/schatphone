const issue = (id, titleZh, titleEn, noteZh, noteEn, tone, mediaPath) => ({
  id,
  titleZh,
  titleEn,
  noteZh,
  noteEn,
  tone,
  mediaPath,
  published: false,
})

export const SHOPPING_29CM_ISSUES = Object.freeze([
  issue('cm29-issue-01-quiet-commute', '安静出门', 'QUIET COMMUTE', '把随身物件重新放回城市节奏。', 'Put everyday objects back into the rhythm of the city.', 'stone', 'images/ui-assets/apps/shopping/29cm/issues/cm29-issue-01-quiet-commute.webp'),
  issue('cm29-issue-02-listening-room', '听见房间', 'LISTENING ROOM', '声音、光线与夜晚之间的短距离。', 'A short distance between sound, light, and night.', 'night', 'images/ui-assets/apps/shopping/29cm/issues/cm29-issue-02-listening-room.webp'),
  issue('cm29-issue-03-desk-ritual', '桌面仪式', 'DESK RITUAL', '把工作留下的痕迹整理成可重复的日常。', 'A repeatable ritual made from the traces work leaves behind.', 'paper', 'images/ui-assets/apps/shopping/29cm/issues/cm29-issue-03-desk-ritual.webp'),
  issue('cm29-issue-04-objects-for-leaving', '离开之前', 'OBJECTS FOR LEAVING', '轻装出发，也把熟悉的触感带走。', 'Travel light, while keeping a familiar touch close.', 'departure', 'images/ui-assets/apps/shopping/29cm/issues/cm29-issue-04-objects-for-leaving.webp'),
])

const productMedia = (productId, slug, tone) => ({
  productId,
  tone,
  main: { id: `cm29-${slug}-main`, mediaPath: `images/ui-assets/apps/shopping/29cm/products/cm29-${slug}-main.webp`, published: false },
  detail: { id: `cm29-${slug}-detail`, mediaPath: `images/ui-assets/apps/shopping/29cm/products/cm29-${slug}-detail.webp`, published: false },
  context: { id: `cm29-${slug}-context`, mediaPath: `images/ui-assets/apps/shopping/29cm/products/cm29-${slug}-context.webp`, published: false },
})

export const SHOPPING_29CM_PRODUCT_MEDIA = Object.freeze({
  shopping_seed_digital_lens: productMedia('shopping_seed_digital_lens', 'digital-lens', 'metal'),
  shopping_seed_digital_headphones: productMedia('shopping_seed_digital_headphones', 'digital-headphones', 'night'),
  shopping_seed_digital_projector: productMedia('shopping_seed_digital_projector', 'digital-projector', 'night'),
  shopping_seed_digital_keyboard: productMedia('shopping_seed_digital_keyboard', 'digital-keyboard', 'paper'),
  shopping_seed_nova_bedside_radio: productMedia('shopping_seed_nova_bedside_radio', 'bedside-radio', 'night'),
  shopping_seed_nova_stone_tray: productMedia('shopping_seed_nova_stone_tray', 'stone-tray', 'stone'),
  shopping_seed_nova_letter_set: productMedia('shopping_seed_nova_letter_set', 'letter-set', 'paper'),
  shopping_seed_nova_carry_on: productMedia('shopping_seed_nova_carry_on', 'carry-on', 'departure'),
  shopping_seed_nova_fountain_pen: productMedia('shopping_seed_nova_fountain_pen', 'fountain-pen', 'paper'),
})

export const SHOPPING_29CM_EDITORIAL_MEDIA = Object.freeze({
  desk: { id: 'cm29-editorial-desk-after-rain', tone: 'paper', mediaPath: 'images/ui-assets/apps/shopping/29cm/editorial/cm29-editorial-desk-after-rain.webp', published: false },
  evening: { id: 'cm29-editorial-evening-wall', tone: 'night', mediaPath: 'images/ui-assets/apps/shopping/29cm/editorial/cm29-editorial-evening-wall.webp', published: false },
  departure: { id: 'cm29-editorial-departure-table', tone: 'departure', mediaPath: 'images/ui-assets/apps/shopping/29cm/editorial/cm29-editorial-departure-table.webp', published: false },
  hard: { id: 'cm29-material-study-hard-surfaces', tone: 'metal', mediaPath: 'images/ui-assets/apps/shopping/29cm/materials/cm29-material-study-hard-surfaces.webp', published: false },
  soft: { id: 'cm29-material-study-soft-records', tone: 'paper', mediaPath: 'images/ui-assets/apps/shopping/29cm/materials/cm29-material-study-soft-records.webp', published: false },
})

export const shopping29cmProductMedia = (productId, role = 'main') =>
  SHOPPING_29CM_PRODUCT_MEDIA[productId]?.[role] || null

export const shopping29cmMediaSource = (media) =>
  media?.published && media.mediaPath ? media.mediaPath : ''

export const shopping29cmIssueMedia = (issueId) =>
  SHOPPING_29CM_ISSUES.find((issue) => issue.id === issueId) || null

export const shopping29cmEditorialMedia = (slot) =>
  SHOPPING_29CM_EDITORIAL_MEDIA[slot] || null

export const shopping29cmIssueSource = (issueId) =>
  shopping29cmMediaSource(shopping29cmIssueMedia(issueId))

export const shopping29cmEditorialSource = (slot) =>
  shopping29cmMediaSource(shopping29cmEditorialMedia(slot))

export const shopping29cmProductTone = (productId) =>
  SHOPPING_29CM_PRODUCT_MEDIA[productId]?.tone || 'stone'
