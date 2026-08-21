export const SHOPPING_APP_PAGE_PROPS = Object.freeze({
  pageKey: { type: String, default: 'category' },
  serviceLabel: { type: String, default: '' },
  category: { type: Object, default: null },
  categories: { type: Array, default: () => [] },
  products: { type: Array, default: () => [] },
  page: { type: Number, default: 1 },
  pageCount: { type: Number, default: 1 },
  totalCount: { type: Number, default: 0 },
  searchQuery: { type: String, default: '' },
  favoritesOnly: { type: Boolean, default: false },
  cartQuantity: { type: Number, default: 0 },
  languageBase: { type: String, default: 'zh' },
  product: { type: Object, default: null },
  relatedProducts: { type: Array, default: () => [] },
  productImageUrl: { type: Function, required: true },
  productDisplayTitle: { type: Function, required: true },
  productDisplayDescription: { type: Function, required: true },
  productCategoryIcon: { type: Function, required: true },
  stockStatusLabel: { type: Function, required: true },
  formatPrice: { type: Function, required: true },
  isProductFavorite: { type: Function, required: true },
})

export const SHOPPING_APP_PAGE_EVENTS = Object.freeze([
  'back',
  'select-category',
  'open-product',
  'add-to-cart',
  'toggle-favorite',
  'open-cart',
  'open-orders',
  'change-page',
  'update:searchQuery',
  'submit-search',
])

export const localizeAppPage = (languageBase, zh, en) => languageBase === 'zh' ? zh : en
