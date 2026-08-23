import { createRouter, createWebHashHistory } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { useShoppingStore } from '../stores/shopping'
import {
  INTERNAL_CHAT_SHARE_ROUTE_QUERY,
  INTERNAL_CHAT_SHARE_ROUTE_VALUE,
  isInternalChatShareRoute,
} from '../lib/internal-chat-share'
import {
  DEFAULT_SHOPPING_SERVICE_KEY,
  buildShoppingAppRoute,
  isShoppingPlatformAppKey,
} from '../lib/planned-module-registry'

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
const TtsSettingsView = () => import('../views/TtsSettingsView.vue')
const ContactsView = () => import('../views/ContactsView.vue')
const GalleryView = () => import('../views/GalleryView.vue')
const CameraView = () => import('../views/CameraView.vue')
const CameraTasksView = () => import('../views/CameraTasksView.vue')
const CameraSettingsView = () => import('../views/CameraSettingsView.vue')
const CameraProvidersView = () => import('../views/CameraProvidersView.vue')
const CameraProviderView = () => import('../views/CameraProviderView.vue')
const CameraDefaultsView = () => import('../views/CameraDefaultsView.vue')
const CameraRoutingView = () => import('../views/CameraRoutingView.vue')
const CameraDiagnosticsView = () => import('../views/CameraDiagnosticsView.vue')
const PhoneView = () => import('../views/PhoneView.vue')
const MapView = () => import('../views/MapView.vue')
const MapSettingsView = () => import('../views/MapSettingsView.vue')
const MapSettingsPlacesView = () => import('../views/MapSettingsPlacesView.vue')
const CalendarView = () => import('../views/CalendarView.vue')
const CalendarAppearanceView = () => import('../views/CalendarAppearanceView.vue')
const AgendaJourneyView = () => import('../views/AgendaJourneyView.vue')
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
const MusicView = () => import('../views/MusicView.vue')
const WeatherView = () => import('../views/WeatherView.vue')
const MailView = () => import('../views/MailView.vue')

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
    { path: '/chat-settings/voice', component: TtsSettingsView },
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
    { path: '/camera', component: CameraView },
    { path: '/camera/tasks', component: CameraTasksView },
    { path: '/camera/settings', component: CameraSettingsView },
    { path: '/camera/settings/providers', component: CameraProvidersView },
    { path: '/camera/settings/providers/:profileId', component: CameraProviderView },
    { path: '/camera/settings/defaults', component: CameraDefaultsView },
    { path: '/camera/settings/app-routing', component: CameraRoutingView },
    { path: '/camera/settings/diagnostics', component: CameraDiagnosticsView },
    { path: '/phone', component: PhoneView },
    { path: '/map', component: MapView },
    { path: '/map/settings', component: MapSettingsView },
    { path: '/map/settings/places', component: MapSettingsPlacesView },
    { path: '/map/labs/kakao-compare', redirect: (to) => ({ path: '/map', query: to.query }) },
    { path: '/calendar', component: CalendarView },
    { path: '/calendar/settings/appearance', component: CalendarAppearanceView },
    { path: '/agenda-journey', component: AgendaJourneyView },
    { path: '/reminders', component: RemindersView },
    { path: '/wallet', component: WalletView },
    { path: '/worldbook', component: WorldBookView },
    { path: '/book', component: BookView },
    { path: '/profile', component: UserProfileView },
    { path: '/stock', component: StockView },
    {
      path: '/shopping',
      component: ShoppingView,
      beforeEnter: (to) => {
        const query = { ...to.query }
        const requestedService = typeof query.service === 'string' ? query.service.trim() : ''
        const shoppingStore = useShoppingStore()
        const productId = typeof query.productId === 'string' ? query.productId.trim() : ''
        const orderId = typeof query.orderId === 'string' ? query.orderId.trim() : ''
        const sourceProduct = productId ? shoppingStore.findProductById(productId) : null
        const sourceOrder = orderId ? shoppingStore.findOrderById(orderId) : null
        const inferredService = sourceOrder?.items?.[0]?.serviceKey || sourceProduct?.serviceKey || ''
        delete query.service
        return {
          path: buildShoppingAppRoute(
            isShoppingPlatformAppKey(requestedService)
              ? requestedService
              : isShoppingPlatformAppKey(inferredService)
                ? inferredService
                : DEFAULT_SHOPPING_SERVICE_KEY,
          ),
          query,
        }
      },
    },
    {
      path: '/shopping/:serviceKey',
      component: ShoppingView,
      beforeEnter: (to) =>
        isShoppingPlatformAppKey(to.params.serviceKey)
          ? true
          : { path: buildShoppingAppRoute(), query: to.query },
    },
    { path: '/food-delivery', component: FoodDeliveryView },
    { path: '/assets', component: AssetsView },
    { path: '/control-center', component: ControlCenterView },
    { path: '/files', component: FilesView },
    { path: '/app-store', component: AppStoreView },
    { path: '/music', component: MusicView },
    { path: '/weather', component: WeatherView },
    { path: '/mail', component: MailView },
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
    return isInternalChatShareRoute(to)
      ? {
          path: '/lock',
          query: {
            continue: INTERNAL_CHAT_SHARE_ROUTE_VALUE,
            [INTERNAL_CHAT_SHARE_ROUTE_QUERY]: INTERNAL_CHAT_SHARE_ROUTE_VALUE,
          },
        }
      : { path: '/lock' }
  }
  return true
})

export default router
