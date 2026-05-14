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
const ContactsView = () => import('../views/ContactsView.vue')
const GalleryView = () => import('../views/GalleryView.vue')
const PhoneView = () => import('../views/PhoneView.vue')
const MapView = () => import('../views/MapView.vue')
const CalendarView = () => import('../views/CalendarView.vue')
const WalletView = () => import('../views/WalletView.vue')
const WorldBookView = () => import('../views/WorldBookView.vue')
const StockView = () => import('../views/StockView.vue')
const UserProfileView = () => import('../views/UserProfileView.vue')
const FilesView = () => import('../views/FilesView.vue')
const MoreView = () => import('../views/MoreView.vue')

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
    { path: '/chat-feature/:feature', component: ChatFeaturePlaceholderView },
    { path: '/chat/:id', component: ChatView },
    { path: '/contacts', component: ContactsView },
    { path: '/gallery', component: GalleryView },
    { path: '/phone', component: PhoneView },
    { path: '/map', component: MapView },
    { path: '/calendar', component: CalendarView },
    { path: '/wallet', component: WalletView },
    { path: '/worldbook', component: WorldBookView },
    { path: '/profile', component: UserProfileView },
    { path: '/stock', component: StockView },
    { path: '/files', component: FilesView },
    { path: '/more', component: MoreView },
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
