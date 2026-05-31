import { createRouter, createWebHashHistory } from 'vue-router'
import { useSystemStore } from '../stores/system'

const LockScreen = () => import('../views/LockScreen.vue')
const HomeView = () => import('../views/HomeView.vue')
const SettingsView = () => import('../views/SettingsView.vue')
const AppearanceView = () => import('../views/AppearanceView.vue')
const WidgetsView = () => import('../views/WidgetsView.vue')
const NetworkView = () => import('../views/NetworkView.vue')
const ChatView = () => import('../views/ChatView.vue')
const ChatDirectoryView = () => import('../views/ChatDirectoryView.vue')
const ChatFeaturePlaceholderView = () => import('../views/ChatFeaturePlaceholderView.vue')
const ChatGroupsView = () => import('../views/ChatGroupsView.vue')
const ChatSettingsView = () => import('../views/ChatSettingsView.vue')
const ChatMeView = () => import('../views/ChatMeView.vue')
const ChatAppearanceView = () => import('../views/ChatAppearanceView.vue')
const ContactsView = () => import('../views/ContactsView.vue')
const GalleryView = () => import('../views/GalleryView.vue')
const PhoneView = () => import('../views/PhoneView.vue')
const MapView = () => import('../views/MapView.vue')
const CalendarView = () => import('../views/CalendarView.vue')
const RemindersView = () => import('../views/RemindersView.vue')
const WalletView = () => import('../views/WalletView.vue')
const WorldBookView = () => import('../views/WorldBookView.vue')
const BookView = () => import('../views/BookView.vue')
const StockView = () => import('../views/StockView.vue')
const ShoppingView = () => import('../views/ShoppingView.vue')
const FoodDeliveryView = () => import('../views/FoodDeliveryView.vue')
const AssetsView = () => import('../views/AssetsView.vue')
const ControlCenterView = () => import('../views/ControlCenterView.vue')
const UserProfileView = () => import('../views/UserProfileView.vue')
const FilesView = () => import('../views/FilesView.vue')
const AppStoreView = () => import('../views/AppStoreView.vue')

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/lock' },
    { path: '/lock', component: LockScreen },
    { path: '/home', component: HomeView },
    { path: '/settings', component: SettingsView },
    { path: '/appearance', component: AppearanceView },
    { path: '/widgets', component: WidgetsView },
    { path: '/network', component: NetworkView },
    { path: '/chat', component: ChatView },
    { path: '/chat-contacts', component: ChatDirectoryView },
    { path: '/chat-settings', component: ChatSettingsView },
    { path: '/chat-settings/appearance', component: ChatAppearanceView },
    { path: '/chat-appearance', redirect: '/chat-settings/appearance' },
    { path: '/chat-me', component: ChatMeView },
    { path: '/chat-feature/more', redirect: '/chat-me' },
    { path: '/chat-feature/identity', redirect: { path: '/chat-me', query: { section: 'identity' } } },
    { path: '/chat-feature/labs', redirect: { path: '/chat-settings', query: { section: 'diagnostics' } } },
    { path: '/chat-feature/:feature', component: ChatFeaturePlaceholderView },
    { path: '/chat-groups', component: ChatGroupsView },
    { path: '/chat/:id', component: ChatView },
    { path: '/contacts', component: ContactsView },
    { path: '/gallery', component: GalleryView },
    { path: '/phone', component: PhoneView },
    { path: '/map', component: MapView },
    { path: '/calendar', component: CalendarView },
    { path: '/reminders', component: RemindersView },
    { path: '/wallet', component: WalletView },
    { path: '/worldbook', component: WorldBookView },
    { path: '/book', component: BookView },
    { path: '/profile', component: UserProfileView },
    { path: '/stock', component: StockView },
    { path: '/shopping', component: ShoppingView },
    { path: '/food-delivery', component: FoodDeliveryView },
    { path: '/assets', component: AssetsView },
    { path: '/control-center', component: ControlCenterView },
    { path: '/files', component: FilesView },
    { path: '/app-store', component: AppStoreView },
    { path: '/more', redirect: '/settings' },
  ],
})

router.beforeEach((to) => {
  const systemStore = useSystemStore()
  if (to.path === '/lock') {
    systemStore.lockPhone()
    return true
  }
  if (systemStore.isLocked) {
    return { path: '/lock' }
  }
  return true
})

export default router
