import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import ChatView from '../views/ChatView.vue'
import SettingsView from '../views/SettingsView.vue'
import AppearanceView from '../views/AppearanceView.vue'
import NetworkView from '../views/NetworkView.vue'
import LockScreen from '../views/LockScreen.vue'
import ContactsView from '../views/ContactsView.vue'
import GalleryView from '../views/GalleryView.vue'
import PhoneView from '../views/PhoneView.vue'
import MapView from '../views/MapView.vue'
import CalendarView from '../views/CalendarView.vue'
import WalletView from '../views/WalletView.vue'
import WorldBookView from '../views/WorldBookView.vue'
import StockView from '../views/StockView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/lock' },
    { path: '/lock', component: LockScreen },
    { path: '/home', component: HomeView },
    { path: '/settings', component: SettingsView },
    { path: '/appearance', component: AppearanceView },
    { path: '/network', component: NetworkView },
    { path: '/chat', component: ChatView },
    { path: '/chat/:id', component: ChatView },
    { path: '/contacts', component: ContactsView },
    { path: '/gallery', component: GalleryView },
    { path: '/phone', component: PhoneView },
    { path: '/map', component: MapView },
    { path: '/calendar', component: CalendarView },
    { path: '/wallet', component: WalletView },
    { path: '/worldbook', component: WorldBookView },
    { path: '/stock', component: StockView },
  ],
})

export default router
