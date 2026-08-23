import { projectAssetUrl } from '../../lib/project-assets'

const publishedMedia = (id, mediaPath, extra = {}) => Object.freeze({
  id,
  mediaPath,
  published: true,
  ...extra,
})

const issue = (id, titleZh, titleEn, noteZh, noteEn, tone) => Object.freeze({
  ...publishedMedia(id, `images/ui-assets/apps/shopping/29cm/issues/${id}.webp`),
  titleZh,
  titleEn,
  noteZh,
  noteEn,
  tone,
})

export const SHOPPING_29CM_ISSUES = Object.freeze([
  issue('cm29-issue-01-quiet-commute', '安静出门', 'QUIET COMMUTE', '把随身物件重新放回城市节奏。', 'Put everyday objects back into the rhythm of the city.', 'stone'),
  issue('cm29-issue-02-listening-room', '听见房间', 'LISTENING ROOM', '声音、光线与夜晚之间的短距离。', 'A short distance between sound, light, and night.', 'night'),
  issue('cm29-issue-03-desk-ritual', '桌面仪式', 'DESK RITUAL', '把工作留下的痕迹整理成可重复的日常。', 'A repeatable ritual made from the traces work leaves behind.', 'paper'),
  issue('cm29-issue-04-objects-for-leaving', '离开之前', 'OBJECTS FOR LEAVING', '轻装出发，也把熟悉的触感带走。', 'Travel light, while keeping a familiar touch close.', 'departure'),
])

const REVIEW_PRODUCT_DETAILS = Object.freeze({
  'digital-lens': { optionZh: '银灰 / 标准套装', optionEn: 'Silver / Standard set', metricsZh: ['操控', '便携', '做工'], metricsEn: ['Handling', 'Portability', 'Build'] },
  'digital-headphones': { optionZh: '炭黑 / 标准版', optionEn: 'Charcoal / Standard', metricsZh: ['音质', '舒适', '隔音'], metricsEn: ['Sound', 'Comfort', 'Isolation'] },
  'digital-projector': { optionZh: '暖白 / 单机', optionEn: 'Warm white / Device only', metricsZh: ['画质', '亮度', '便携'], metricsEn: ['Picture', 'Brightness', 'Portability'] },
  'digital-keyboard': { optionZh: '雾灰 / 低矮轴', optionEn: 'Fog gray / Low profile', metricsZh: ['手感', '声音', '做工'], metricsEn: ['Feel', 'Sound', 'Build'] },
  'bedside-radio': { optionZh: '卵石灰 / 标准版', optionEn: 'Pebble gray / Standard', metricsZh: ['操作', '声音', '做工'], metricsEn: ['Controls', 'Sound', 'Build'] },
  'stone-tray': { optionZh: '自然灰 / 中号', optionEn: 'Natural gray / Medium', metricsZh: ['质感', '尺寸', '做工'], metricsEn: ['Texture', 'Size', 'Build'] },
  'letter-set': { optionZh: '夜蓝 / 12 件套', optionEn: 'Night blue / 12-piece set', metricsZh: ['纸张', '配色', '包装'], metricsEn: ['Paper', 'Color', 'Packaging'] },
  'carry-on': { optionZh: '岩灰 / 20 英寸', optionEn: 'Rock gray / 20 inch', metricsZh: ['容量', '推行', '做工'], metricsEn: ['Capacity', 'Rolling', 'Build'] },
  'fountain-pen': { optionZh: '墨黑 / F 尖', optionEn: 'Ink black / Fine nib', metricsZh: ['书写', '握持', '做工'], metricsEn: ['Writing', 'Grip', 'Build'] },
})

const REVIEW_ROLE_DETAILS = Object.freeze({
  scene: { rating: 5, periodZh: '使用 3 周', periodEn: 'Used for 3 weeks', scores: [5, 5, 4] },
  detail: { rating: 4, periodZh: '使用 10 天', periodEn: 'Used for 10 days', scores: [4, 5, 4] },
  'follow-up': { rating: 4, periodZh: '使用 1 个月后追评', periodEn: 'Follow-up after 1 month', scores: [4, 4, 4] },
})

const ownerNote = (slug, role, noteZh, noteEn, owner, date) => publishedMedia(
  `cm29-${slug}-owner-${role}`,
  `images/ui-assets/apps/shopping/29cm/owners/cm29-${slug}-owner-${role}.webp`,
  { role, noteZh, noteEn, owner, date, ...REVIEW_PRODUCT_DETAILS[slug], ...REVIEW_ROLE_DETAILS[role] },
)

const productMedia = (productId, slug, tone, ownerNotes) => Object.freeze({
  productId,
  tone,
  main: publishedMedia(`cm29-${slug}-main`, `images/ui-assets/apps/shopping/29cm/products/cm29-${slug}-main.webp`),
  detail: publishedMedia(`cm29-${slug}-detail`, `images/ui-assets/apps/shopping/29cm/products/cm29-${slug}-detail.webp`),
  context: publishedMedia(`cm29-${slug}-context`, `images/ui-assets/apps/shopping/29cm/products/cm29-${slug}-context.webp`),
  owners: Object.freeze(ownerNotes),
})

export const SHOPPING_29CM_PRODUCT_MEDIA = Object.freeze({
  shopping_seed_digital_lens: productMedia('shopping_seed_digital_lens', 'digital-lens', 'metal', [
    ownerNote('digital-lens', 'scene', '带出去拍了三次，重量比我原来的镜头轻，下午逆光对焦也没有明显犹豫。', 'Quieter than expected in the late-afternoon light.', 'JH', '08.18'),
    ownerNote('digital-lens', 'detail', '对焦环转起来顺，但刚开箱时稍微有点紧。放进日常通勤的小包没问题。', 'The metal ring feels deliberate without making the bag heavy.', 'SY', '08.09'),
  ]),
  shopping_seed_digital_headphones: productMedia('shopping_seed_digital_headphones', 'digital-headphones', 'night', [
    ownerNote('digital-headphones', 'scene', '声音偏暖，人声很近。连续听两个小时耳朵不会压得疼，不过夏天戴久了还是会热。', 'The room finally slows down when an album plays through at night.', 'MK', '08.20'),
    ownerNote('digital-headphones', 'detail', '耳垫确实软，眼镜腿也不会被夹得难受。降噪够通勤用，但不是完全听不到报站。', 'The cushions feel softer than they look.', 'HA', '08.11'),
  ]),
  shopping_seed_digital_projector: productMedia('shopping_seed_digital_projector', 'digital-projector', 'night', [
    ownerNote('digital-projector', 'scene', '直接投白墙也能看，晚上效果最好。白天拉一层窗帘还可以，字幕边缘算清楚。', 'No screening room needed; a white wall is enough for the weekend.', 'YR', '08.17'),
    ownerNote('digital-projector', 'detail', '机器比想象中小，散热声坐远一点就不明显。接口位置有点靠后，插线时不太顺手。', 'It takes up only one quiet square on the shelf.', 'DN', '08.05'),
  ]),
  shopping_seed_digital_keyboard: productMedia('shopping_seed_digital_keyboard', 'digital-keyboard', 'paper', [
    ownerNote('digital-keyboard', 'scene', '低矮键帽适应得很快，声音比普通机械键盘小，办公室用不会太打扰旁边的人。', 'The keystrokes stay out of the way during early writing.', 'EC', '08.21'),
    ownerNote('digital-keyboard', 'detail', '键帽字符清楚，空格键略响，其他大键没有明显晃动。蓝牙切换速度正常。', 'The legends stay clear and the low profile is easy to settle into.', 'JL', '08.14'),
    ownerNote('digital-keyboard', 'follow-up', '用了一个月再来补充：电量还可以，键帽暂时没打油，但浅色外壳确实要常擦。', 'Two weeks later, it still earns its place on the desk.', 'EC', '08.22'),
  ]),
  shopping_seed_nova_bedside_radio: productMedia('shopping_seed_nova_bedside_radio', 'bedside-radio', 'night', [
    ownerNote('bedside-radio', 'scene', '放床头大小正合适，最低音量不会突然很响。夜里转旋钮比摸手机方便。', 'At bedtime, one lamp and a low radio are enough.', 'SH', '08.19'),
    ownerNote('bedside-radio', 'detail', '旋钮刻度清楚，单手就能调。声音不算特别厚，但听新闻和轻音乐够用了。', 'The dial makes more sense than a touchscreen when half awake.', 'HW', '08.08'),
  ]),
  shopping_seed_nova_stone_tray: productMedia('shopping_seed_nova_stone_tray', 'stone-tray', 'stone', [
    ownerNote('stone-tray', 'scene', '中号放钥匙、手表和两枚戒指刚好。底部不会刮桌面，但托盘本身比照片看着重。', 'Keys, rings, and small things finally have a place.', 'AR', '08.16'),
    ownerNote('stone-tray', 'detail', '收到后边缘有轻微不规则，不是破损，应该是材质本身的效果。颜色比页面稍深一点。', 'The edge is not perfectly regular, which is exactly right.', 'JY', '08.07'),
    ownerNote('stone-tray', 'follow-up', '用了一个月没有掉粉，清洁用干布就行。要放眼镜的话，中号会稍微有点挤。', 'Coming home now ends with the same small gesture.', 'AR', '08.22'),
  ]),
  shopping_seed_nova_letter_set: productMedia('shopping_seed_nova_letter_set', 'letter-set', 'paper', [
    ownerNote('letter-set', 'scene', '纸比普通信纸厚，钢笔写没有洇墨。信封封口偏紧，第一次装的时候要慢一点。', 'The paper makes an ordinary sentence worth writing slowly.', 'TM', '08.15'),
    ownerNote('letter-set', 'detail', '蓝色没有图片那么深，实物更偏灰。包装完整，金属书签没有划痕。', 'The envelopes and metal bookmark feel quietly resolved together.', 'LN', '08.04'),
  ]),
  shopping_seed_nova_carry_on: productMedia('shopping_seed_nova_carry_on', 'carry-on', 'departure', [
    ownerNote('carry-on', 'scene', '两天一夜的衣物加电脑能装下，内部隔层够用。满载后提起来还是有点重。', 'Two nights away no longer asks for a second bag.', 'BK', '08.20'),
    ownerNote('carry-on', 'detail', '轮子在商场地面很顺，过砖缝会有声音。拉链不卡，转角暂时没有压痕。', 'The zipper and corners are the first details that reassure.', 'IS', '08.12'),
    ownerNote('carry-on', 'follow-up', '第一次托运后有两道浅划痕，擦不掉但不明显。轮子和拉杆目前都正常。', 'After the first trip, the shell wears in more naturally than expected.', 'BK', '08.22'),
  ]),
  shopping_seed_nova_fountain_pen: productMedia('shopping_seed_nova_fountain_pen', 'fountain-pen', 'paper', [
    ownerNote('fountain-pen', 'scene', 'F 尖日常记笔记合适，出墨稳定，写小字不会太粗。第一次上墨需要多等一会儿。', 'It gives even a to-do list some of the care of a letter.', 'CR', '08.13'),
    ownerNote('fountain-pen', 'detail', '握位不滑，重量偏轻。纸张太薄时背面会透，普通笔记本上表现正常。', 'The nib stays steady and the grip avoids unnecessary decoration.', 'SM', '08.03'),
  ]),
})

export const SHOPPING_29CM_EDITORIAL_MEDIA = Object.freeze({
  desk: publishedMedia('cm29-editorial-desk-after-rain', 'images/ui-assets/apps/shopping/29cm/editorial/cm29-editorial-desk-after-rain.webp', { tone: 'paper' }),
  evening: publishedMedia('cm29-editorial-evening-wall', 'images/ui-assets/apps/shopping/29cm/editorial/cm29-editorial-evening-wall.webp', { tone: 'night' }),
  departure: publishedMedia('cm29-editorial-departure-table', 'images/ui-assets/apps/shopping/29cm/editorial/cm29-editorial-departure-table.webp', { tone: 'departure' }),
  hard: publishedMedia('cm29-material-study-hard-surfaces', 'images/ui-assets/apps/shopping/29cm/materials/cm29-material-study-hard-surfaces.webp', { tone: 'metal' }),
  soft: publishedMedia('cm29-material-study-soft-records', 'images/ui-assets/apps/shopping/29cm/materials/cm29-material-study-soft-records.webp', { tone: 'paper' }),
})

export const SHOPPING_29CM_STATE_MEDIA = Object.freeze({
  collection: publishedMedia('cm29-state-empty-collection', 'images/ui-assets/apps/shopping/29cm/states/cm29-state-empty-collection.webp', { tone: 'paper' }),
  bag: publishedMedia('cm29-state-empty-bag', 'images/ui-assets/apps/shopping/29cm/states/cm29-state-empty-bag.webp', { tone: 'stone' }),
  archive: publishedMedia('cm29-state-empty-archive', 'images/ui-assets/apps/shopping/29cm/states/cm29-state-empty-archive.webp', { tone: 'paper' }),
  offline: publishedMedia('cm29-state-offline-media', 'images/ui-assets/apps/shopping/29cm/states/cm29-state-offline-media.webp', { tone: 'night' }),
})

export const SHOPPING_29CM_MOTION_MEDIA = Object.freeze({
  loop: publishedMedia('cm29-motion-light-across-objects', 'images/ui-assets/apps/shopping/29cm/motion/cm29-motion-light-across-objects.webp', { tone: 'paper' }),
  poster: publishedMedia('cm29-motion-light-across-objects-poster', 'images/ui-assets/apps/shopping/29cm/motion/cm29-motion-light-across-objects-poster.webp', { tone: 'paper' }),
})

export const shopping29cmProductMedia = (productId, role = 'main') =>
  SHOPPING_29CM_PRODUCT_MEDIA[productId]?.[role] || null

export const shopping29cmOwnerNotes = (productId) =>
  SHOPPING_29CM_PRODUCT_MEDIA[productId]?.owners || []

export const shopping29cmMediaSource = (media) =>
  media?.published && media.mediaPath ? projectAssetUrl(media.mediaPath) : ''

export const shopping29cmIssueMedia = (issueId) =>
  SHOPPING_29CM_ISSUES.find((item) => item.id === issueId) || null

export const shopping29cmEditorialMedia = (slot) =>
  SHOPPING_29CM_EDITORIAL_MEDIA[slot] || null

export const shopping29cmStateMedia = (slot) =>
  SHOPPING_29CM_STATE_MEDIA[slot] || null

export const shopping29cmIssueSource = (issueId) =>
  shopping29cmMediaSource(shopping29cmIssueMedia(issueId))

export const shopping29cmEditorialSource = (slot) =>
  shopping29cmMediaSource(shopping29cmEditorialMedia(slot))

export const shopping29cmStateSource = (slot) =>
  shopping29cmMediaSource(shopping29cmStateMedia(slot))

export const shopping29cmProductTone = (productId) =>
  SHOPPING_29CM_PRODUCT_MEDIA[productId]?.tone || 'stone'
