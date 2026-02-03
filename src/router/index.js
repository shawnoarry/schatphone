import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import ChatView from '../views/ChatView.vue'
import SettingsView from '../views/SettingsView.vue'
import LockScreen from '../views/LockScreen.vue'
import ContactsView from '../views/ContactsView.vue'
import GalleryView from '../views/GalleryView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/lock' },
    { path: '/lock', component: LockScreen },
    { path: '/home', component: HomeView },
    { path: '/settings', component: SettingsView },
    { path: '/chat', component: ChatView },
    { path: '/chat/:id', component: ChatView },
    { path: '/contacts', component: ContactsView },
    { path: '/gallery', component: GalleryView },
  ],
})

export default router
