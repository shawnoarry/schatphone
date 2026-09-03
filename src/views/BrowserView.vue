<template>
  <div
    class="prism-browser"
    data-app="browser"
    data-route-scope="browser"
    data-testid="prism-browser-app"
  >
    <header class="prism-browser__topbar">
      <button
        type="button"
        class="prism-browser__home"
        :aria-label="t('返回主屏幕', 'Back to Home')"
        data-testid="browser-home-back"
        @click="goHome"
      >
        <i class="fas fa-arrow-left" aria-hidden="true"></i>
      </button>

      <button
        type="button"
        class="prism-browser__brand"
        :aria-label="t('折光浏览器首页', 'Prism Browser home')"
        data-testid="browser-brand-home"
        @click="showHome"
      >
        <span class="prism-browser__brand-mark" aria-hidden="true">
          <i class="fas fa-compass"></i>
        </span>
        <span class="prism-browser__brand-copy">
          <strong>{{ t('折光', 'Prism') }}</strong>
          <small>{{ t('帮助 · 世界 · 网络', 'Help · World · Web') }}</small>
        </span>
      </button>

      <div class="prism-browser__top-actions">
        <button
          type="button"
          :class="{ 'is-active': libraryView === 'history' && currentView === 'library' }"
          :aria-label="t('浏览历史', 'Browsing history')"
          data-testid="browser-history-open"
          @click="openLibrary('history')"
        >
          <i class="fas fa-clock-rotate-left" aria-hidden="true"></i>
          <span class="prism-browser__action-label">{{ t('历史', 'History') }}</span>
        </button>
        <button
          type="button"
          :class="{ 'is-active': libraryView === 'bookmarks' && currentView === 'library' }"
          :aria-label="t('书签', 'Bookmarks')"
          data-testid="browser-bookmarks-open"
          @click="openLibrary('bookmarks')"
        >
          <i class="fas fa-bookmark" aria-hidden="true"></i>
          <span class="prism-browser__action-label">{{ t('书签', 'Bookmarks') }}</span>
        </button>
      </div>
    </header>

    <main class="prism-browser__main">
      <BrowserDetail
        v-if="currentView === 'detail' && selectedRecord"
        :record="selectedRecord"
        :is-zh="isZh"
        :bookmarked="bookmarkedIds.includes(selectedRecord.resultId)"
        :back-label="t('返回搜索结果', 'Back to search results')"
        :bookmark-label="detailBookmarkLabel"
        :unavailable-title="t('这个页面已经不可用', 'This page is no longer available')"
        :unavailable-body="t('来源已经撤回或不再适用于当前世界。折光不会继续展示缓存正文。', 'The source was withdrawn or no longer applies to this world. Prism will not keep showing a cached copy.')"
        :back-to-results-label="t('返回结果', 'Back to results')"
        :help-kicker="t('折光使用帮助', 'Prism Help Center')"
        :world-kicker="t('当前世界公开页面', 'Public current-world page')"
        :updated-label="t('更新', 'Updated')"
        :source-note="detailSourceNote"
        product-domain="help.schatphone.local"
        @back="backFromDetail"
        @bookmark="toggleBookmark(selectedRecord.resultId)"
        @open-owner="openOwner"
      />

      <section v-else-if="currentView === 'library'" class="prism-library" data-testid="browser-library">
        <div class="prism-library__heading">
          <div>
            <p>{{ t('你的设备', 'On this device') }}</p>
            <h1>{{ libraryView === 'history' ? t('浏览历史', 'Browsing history') : t('书签', 'Bookmarks') }}</h1>
          </div>
          <button type="button" class="prism-library__close" @click="showHome">
            <i class="fas fa-xmark" aria-hidden="true"></i>
            <span>{{ t('关闭', 'Close') }}</span>
          </button>
        </div>

        <template v-if="libraryView === 'history'">
          <div class="prism-library__controls">
            <label class="prism-history-toggle">
              <input
                v-model="shellState.historyEnabled"
                type="checkbox"
                data-testid="browser-history-toggle"
                @change="persistState"
              />
              <span aria-hidden="true"></span>
              {{ t('记录本机搜索历史', 'Save search history on this device') }}
            </label>
            <button
              v-if="shellState.history.length"
              type="button"
              class="prism-library__clear"
              data-testid="browser-history-clear"
              @click="clearHistory"
            >
              {{ t('清除全部', 'Clear all') }}
            </button>
          </div>

          <div v-if="shellState.history.length" class="prism-library__list">
            <div v-for="entry in shellState.history" :key="`${entry.id}-${entry.at}`" class="prism-library__row">
              <button type="button" class="prism-library__row-main" @click="searchHistory(entry.query)">
                <i class="fas fa-clock-rotate-left" aria-hidden="true"></i>
                <span>
                  <strong>{{ entry.query }}</strong>
                  <small>{{ formatHistoryTime(entry.at) }}</small>
                </span>
              </button>
              <button
                type="button"
                class="prism-library__remove"
                :aria-label="t(`删除历史：${entry.query}`, `Delete history: ${entry.query}`)"
                @click="removeHistory(entry.id)"
              >
                <i class="fas fa-xmark" aria-hidden="true"></i>
              </button>
            </div>
          </div>
          <BrowserEmptyState
            v-else
            icon="fa-clock"
            :title="t('还没有搜索历史', 'No search history yet')"
            :body="shellState.historyEnabled ? t('你提交的本地搜索会出现在这里。', 'Local searches you submit will appear here.') : t('历史记录已关闭。搜索仍可正常使用。', 'History is off. Search still works normally.')"
          />
        </template>

        <template v-else>
          <BrowserResultList
            v-if="bookmarkedRecords.length"
            :results="bookmarkedRecords"
            :bookmarked-ids="bookmarkedIds"
            :is-zh="isZh"
            :list-label="t('已收藏页面', 'Bookmarked pages')"
            :unavailable-label="t('来源不可用', 'Source unavailable')"
            :bookmark-label="bookmarkLabel"
            @open="openRecord"
            @bookmark="toggleBookmark"
          />
          <BrowserEmptyState
            v-else
            icon="fa-bookmark"
            :title="t('还没有书签', 'No bookmarks yet')"
            :body="t('收藏帮助文章或世界公开页面，之后可以从这里再次打开。', 'Bookmark a help article or public world page to find it here later.')"
          />
        </template>
      </section>

      <template v-else>
        <section v-if="currentView === 'home'" class="prism-home" data-testid="browser-home">
          <div class="prism-home__masthead">
            <div class="prism-home__signal" aria-hidden="true">
              <span></span><span></span><span></span>
            </div>
            <p class="prism-home__eyebrow">{{ t('从可信来源开始', 'Begin with a named source') }}</p>
            <h1>{{ t('你想找到什么？', 'What are you looking for?') }}</h1>
            <p class="prism-home__lede">
              {{ t('查手机用法，也查当前世界。每条结果都保留自己的出处。', 'Search the phone and the current world. Every result keeps its own provenance.') }}
            </p>
            <BrowserSearchBar
              v-model="queryDraft"
              :placeholder="t('搜索帮助、地点、机构…', 'Search help, places, organizations…')"
              :aria-label="t('搜索折光浏览器', 'Search Prism Browser')"
              :clear-label="t('清除搜索', 'Clear search')"
              :submit-label="t('搜索', 'Search')"
              @submit="submitSearch"
              @clear="clearSearchDraft"
            />
          </div>

          <div class="prism-home__grid">
            <section class="prism-home__start">
              <div class="prism-section-heading">
                <div>
                  <p>{{ t('常用入口', 'Good starting points') }}</p>
                  <h2>{{ t('从一个明确的问题开始', 'Start with a clear question') }}</h2>
                </div>
              </div>
              <div class="prism-question-grid">
                <button
                  v-for="question in quickQuestions"
                  :key="question.query"
                  type="button"
                  @click="runQuickSearch(question.query)"
                >
                  <span :class="`is-${question.kind}`"><i class="fas" :class="question.icon" aria-hidden="true"></i></span>
                  <strong>{{ question.label }}</strong>
                  <i class="fas fa-arrow-right" aria-hidden="true"></i>
                </button>
              </div>
            </section>

            <aside class="prism-home__sources" aria-label="Search sources">
              <p>{{ t('三个空间，始终分开', 'Three spaces, always distinct') }}</p>
              <div>
                <span class="is-help"><i class="fas fa-circle-question" aria-hidden="true"></i></span>
                <strong>{{ t('使用帮助', 'Help') }}</strong>
                <small>{{ t('功能说明与操作方法', 'Product guidance and steps') }}</small>
              </div>
              <div>
                <span class="is-world"><i class="fas fa-earth-asia" aria-hidden="true"></i></span>
                <strong>{{ t('现代首尔', 'Modern Seoul') }}</strong>
                <small>{{ t('公开地点、机构与知识', 'Public places, organizations, knowledge') }}</small>
              </div>
              <div>
                <span class="is-web"><i class="fas fa-globe" aria-hidden="true"></i></span>
                <strong>{{ t('互联网', 'Web') }}</strong>
                <small>{{ t('外部搜索尚未连接', 'External search is not connected') }}</small>
              </div>
            </aside>
          </div>

          <section v-if="recentRecords.length" class="prism-home__recent">
            <div class="prism-section-heading">
              <div>
                <p>{{ t('最近访问', 'Recently visited') }}</p>
                <h2>{{ t('继续阅读', 'Continue reading') }}</h2>
              </div>
            </div>
            <div class="prism-recent-strip">
              <button v-for="record in recentRecords" :key="record.resultId" type="button" @click="openRecord(record.resultId)">
                <span><i class="fas" :class="sourceMeta[record.sourceKind].icon" aria-hidden="true"></i></span>
                <strong>{{ isZh ? record.titleZh : record.titleEn }}</strong>
              </button>
            </div>
          </section>
        </section>

        <section v-else class="prism-search-page" data-testid="browser-search-results">
          <div class="prism-search-page__sticky">
            <BrowserSearchBar
              v-model="queryDraft"
              :placeholder="t('继续搜索', 'Search again')"
              :aria-label="t('搜索折光浏览器', 'Search Prism Browser')"
              :clear-label="t('清除搜索', 'Clear search')"
              :submit-label="t('搜索', 'Search')"
              @submit="submitSearch"
              @clear="clearSearchDraft"
            />
            <nav class="prism-sources" :aria-label="t('结果来源', 'Result sources')">
              <button
                v-for="scope in sourceTabs"
                :key="scope.id"
                type="button"
                :class="{ 'is-active': activeSource === scope.id }"
                :aria-pressed="activeSource === scope.id ? 'true' : 'false'"
                :data-testid="`browser-source-${scope.id}`"
                @click="selectSource(scope.id)"
              >
                <i v-if="scope.icon" class="fas" :class="scope.icon" aria-hidden="true"></i>
                {{ scope.label }}
                <span v-if="scope.id !== 'web'">{{ resultCounts[scope.id] }}</span>
              </button>
            </nav>
          </div>

          <div class="prism-search-page__meta">
            <p v-if="submittedQuery">
              {{ t(`“${submittedQuery}”的结果`, `Results for “${submittedQuery}”`) }}
            </p>
            <p v-else>{{ t('浏览全部本地内容', 'Browse all local content') }}</p>
            <span>{{ resultMeta }}</span>
          </div>

          <div v-if="isSearching" class="prism-loading" role="status" data-testid="browser-loading">
            <span></span><span></span><span></span>
            {{ t('正在检索本地来源…', 'Searching local sources…') }}
          </div>

          <div
            v-else-if="activeSource === 'web'"
            class="prism-web-unavailable"
            role="status"
            data-testid="browser-web-unavailable"
          >
            <span class="prism-web-unavailable__icon" aria-hidden="true"><i class="fas fa-globe"></i></span>
            <div>
              <p>{{ t('互联网来源尚未连接', 'Web source is not connected') }}</p>
              <h2>{{ t('本地搜索仍然完整可用', 'Local search remains fully available') }}</h2>
              <p>{{ t('折光不会伪造网页结果，也不会把查询静默发送到外部网站。你仍可切换到使用帮助或当前世界。', 'Prism does not fabricate web results or silently send your query to an external site. Help and Current World remain available.') }}</p>
            </div>
            <button type="button" @click="selectSource('all')">{{ t('查看本地结果', 'View local results') }}</button>
          </div>

          <BrowserResultList
            v-else-if="visibleResults.length"
            :results="visibleResults"
            :bookmarked-ids="bookmarkedIds"
            :is-zh="isZh"
            :list-label="t('搜索结果', 'Search results')"
            :unavailable-label="t('来源不可用', 'Source unavailable')"
            :bookmark-label="bookmarkLabel"
            @open="openRecord"
            @bookmark="toggleBookmark"
          />

          <BrowserEmptyState
            v-else
            icon="fa-magnifying-glass"
            :title="t('没有找到本地结果', 'No local results found')"
            :body="t('试试地点名、App 名称或更短的关键词。没有结果时，折光不会用模型补写答案。', 'Try a place name, app name, or a shorter phrase. Prism will not ask a model to invent an answer when nothing matches.')"
          >
            <button type="button" @click="runQuickSearch(isZh ? '日历 日程 行程' : 'calendar agenda journey')">
              {{ t('试试“日历 日程 行程”', 'Try “calendar agenda journey”') }}
            </button>
          </BrowserEmptyState>
        </section>
      </template>
    </main>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { pushReturnTarget } from '../lib/navigation-return'
import {
  BROWSER_SOURCE_META,
  getBrowserShellRecord,
  loadBrowserShellState,
  saveBrowserShellState,
  searchBrowserShellRecords,
} from '../lib/browser-shell-data'
import BrowserSearchBar from '../components/browser/BrowserSearchBar.vue'
import BrowserResultList from '../components/browser/BrowserResultList.vue'
import BrowserDetail from '../components/browser/BrowserDetail.vue'
import BrowserEmptyState from '../components/browser/BrowserEmptyState.vue'

const route = useRoute()
const router = useRouter()
// Prism is an independent app with a fixed mint-paper identity: it never
// follows the system day/night switch (independent-app rule).
const { t, isZh } = useI18n()

const sourceMeta = BROWSER_SOURCE_META
const shellState = reactive(loadBrowserShellState())
const queryDraft = ref(typeof route.query.q === 'string' ? route.query.q : '')
const submittedQuery = ref(queryDraft.value.trim())
const initialScope = typeof route.query.scope === 'string' ? route.query.scope : 'all'
const activeSource = ref(['all', 'help', 'world', 'web'].includes(initialScope) ? initialScope : 'all')
const selectedRecordId = ref(typeof route.query.result === 'string' ? route.query.result : '')
const currentView = ref(selectedRecordId.value ? 'detail' : submittedQuery.value ? 'results' : 'home')
const libraryView = ref('history')
const isSearching = ref(false)
let searchTimer = null

const allMatchedResults = computed(() =>
  searchBrowserShellRecords({ query: submittedQuery.value, sourceKind: 'all', isZh: isZh.value }),
)
const visibleResults = computed(() =>
  searchBrowserShellRecords({
    query: submittedQuery.value,
    sourceKind: activeSource.value,
    isZh: isZh.value,
  }),
)
const resultCounts = computed(() => ({
  all: allMatchedResults.value.length,
  help: allMatchedResults.value.filter((record) => record.sourceKind === 'help').length,
  world: allMatchedResults.value.filter((record) => record.sourceKind === 'world').length,
}))
const selectedRecord = computed(() => getBrowserShellRecord(selectedRecordId.value))
const bookmarkedIds = computed(() => shellState.bookmarks.map((entry) => entry.id))
const bookmarkedRecords = computed(() =>
  shellState.bookmarks.map((entry) => getBrowserShellRecord(entry.id)).filter(Boolean),
)
const recentRecords = computed(() =>
  shellState.recent.slice(0, 4).map((entry) => getBrowserShellRecord(entry.id)).filter(Boolean),
)

const quickQuestions = computed(() => [
  {
    query: isZh.value ? '日历 日程 行程' : 'calendar agenda journey',
    label: t('日历、日程和行程有什么区别？', 'Calendar, Agenda, or Journey?'),
    kind: 'help',
    icon: 'fa-calendar-day',
  },
  {
    query: isZh.value ? 'Hanul 放送中心' : 'Hanul Broadcast Center',
    label: t('Hanul 放送中心在哪里？', 'Where is Hanul Broadcast Center?'),
    kind: 'world',
    icon: 'fa-tower-broadcast',
  },
  {
    query: isZh.value ? '修改外卖地址' : 'change delivery address',
    label: t('怎样修改外卖地址？', 'How do I change a delivery address?'),
    kind: 'help',
    icon: 'fa-location-dot',
  },
])

const sourceTabs = computed(() => [
  { id: 'all', label: t('全部', 'All'), icon: '' },
  { id: 'help', label: t('使用帮助', 'Help'), icon: 'fa-circle-question' },
  { id: 'world', label: t('当前世界', 'Current World'), icon: 'fa-earth-asia' },
  { id: 'web', label: t('互联网', 'Web'), icon: 'fa-globe' },
])

const resultMeta = computed(() => {
  if (activeSource.value === 'web') return t('外部来源未连接', 'External source not connected')
  const count = visibleResults.value.length
  return isZh.value ? `${count} 条本地结果 · 零 token` : `${count} local result${count === 1 ? '' : 's'} · zero token`
})

const detailBookmarkLabel = computed(() => {
  if (!selectedRecord.value) return ''
  const title = isZh.value ? selectedRecord.value.titleZh : selectedRecord.value.titleEn
  return bookmarkedIds.value.includes(selectedRecord.value.resultId)
    ? t(`取消收藏：${title}`, `Remove bookmark: ${title}`)
    : t(`收藏：${title}`, `Bookmark: ${title}`)
})

const detailSourceNote = computed(() => {
  if (selectedRecord.value?.sourceKind === 'world') {
    return t('这是当前世界中的公开资料投影；地点与机构仍由来源 App 管理。', 'This is a public current-world projection; its source app still owns the place or organization.')
  }
  return t('这是面向用户发布的帮助文章，不会直接修改任何 App 数据。', 'This is a published help article and never changes app data directly.')
})

const persistState = () => saveBrowserShellState(shellState)

const recordHistory = (query) => {
  const normalized = query.trim()
  if (!shellState.historyEnabled || !normalized) return
  shellState.history = [
    { id: `history_${Date.now()}`, query: normalized, at: Date.now() },
    ...shellState.history.filter((entry) => entry.query.toLocaleLowerCase() !== normalized.toLocaleLowerCase()),
  ].slice(0, 30)
  persistState()
}

const submitSearch = () => {
  const nextQuery = queryDraft.value.trim()
  submittedQuery.value = nextQuery
  currentView.value = 'results'
  selectedRecordId.value = ''
  recordHistory(nextQuery)
  if (searchTimer) clearTimeout(searchTimer)
  isSearching.value = true
  searchTimer = setTimeout(() => {
    isSearching.value = false
  }, 180)
}

const runQuickSearch = (query) => {
  queryDraft.value = query
  activeSource.value = 'all'
  submitSearch()
}

const searchHistory = (query) => {
  queryDraft.value = query
  activeSource.value = 'all'
  submitSearch()
}

const clearSearchDraft = () => {
  queryDraft.value = ''
}

const selectSource = (scope) => {
  activeSource.value = scope
  currentView.value = 'results'
}

const openRecord = (resultId) => {
  const record = getBrowserShellRecord(resultId)
  if (!record) return
  selectedRecordId.value = resultId
  currentView.value = 'detail'
  shellState.recent = [
    { id: resultId, at: Date.now() },
    ...shellState.recent.filter((entry) => entry.id !== resultId),
  ].slice(0, 30)
  persistState()
}

const backFromDetail = () => {
  selectedRecordId.value = ''
  currentView.value = submittedQuery.value || activeSource.value !== 'all' ? 'results' : 'home'
}

const toggleBookmark = (resultId) => {
  const index = shellState.bookmarks.findIndex((entry) => entry.id === resultId)
  if (index >= 0) shellState.bookmarks.splice(index, 1)
  else shellState.bookmarks.unshift({ id: resultId, at: Date.now() })
  persistState()
}

const bookmarkLabel = (record) => {
  const title = isZh.value ? record.titleZh : record.titleEn
  return bookmarkedIds.value.includes(record.resultId)
    ? t(`取消收藏：${title}`, `Remove bookmark: ${title}`)
    : t(`收藏：${title}`, `Bookmark: ${title}`)
}

const openLibrary = (kind) => {
  libraryView.value = kind
  currentView.value = 'library'
}

const removeHistory = (historyId) => {
  shellState.history = shellState.history.filter((entry) => entry.id !== historyId)
  persistState()
}

const clearHistory = () => {
  shellState.history = []
  persistState()
}

const formatHistoryTime = (at) =>
  new Intl.DateTimeFormat(isZh.value ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(at))

const showHome = () => {
  currentView.value = 'home'
  selectedRecordId.value = ''
}

const openOwner = (record) => {
  if (!record?.targetRef) return
  router.push({
    path: record.targetRef,
    query: {
      source: 'browser',
      browserQuery: submittedQuery.value,
      browserResult: record.resultId,
      browserScope: activeSource.value,
      ...(route.query.homePage ? { homePage: route.query.homePage } : {}),
    },
  })
}

const goHome = () => pushReturnTarget(router, route, '/home')

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<style scoped>
.prism-browser {
  --prism-bg: #eef3ef;
  --prism-bg-deep: #dce9e4;
  --prism-panel: rgba(255, 255, 252, 0.94);
  --prism-article: #fffefa;
  --prism-toolbar: rgba(255, 255, 252, 0.88);
  --prism-search-bg: #fffefa;
  --prism-text: #102a2e;
  --prism-text-soft: #38565a;
  --prism-article-text: #233f43;
  --prism-muted: #647b7d;
  --prism-border: rgba(31, 85, 87, 0.16);
  --prism-border-strong: rgba(31, 85, 87, 0.34);
  --prism-rule: rgba(31, 85, 87, 0.14);
  --prism-accent: #1f6f78;
  --prism-accent-strong: #155c64;
  --prism-action: #17646c;
  --prism-action-hover: #0f5259;
  --prism-action-text: #ffffff;
  --prism-help: #d39a35;
  --prism-help-text: #8a5a08;
  --prism-world: #27857e;
  --prism-world-text: #176861;
  --prism-web: #7480a3;
  --prism-focus: rgba(31, 111, 120, 0.22);
  --prism-hover: rgba(31, 111, 120, 0.09);
  --prism-warning-bg: #fff0d3;
  --prism-warning-text: #7d4b00;
  --prism-help-hero: linear-gradient(145deg, #f7f1df 0%, #f3ead3 100%);
  --prism-world-hero: linear-gradient(145deg, #daf0ea 0%, #cfe8e2 100%);
  --prism-hero-ring: rgba(31, 111, 120, 0.09);
  --prism-search-shadow: 0 18px 44px rgba(23, 75, 75, 0.13);
  --prism-panel-shadow: 0 10px 28px rgba(28, 67, 66, 0.07);
  --prism-panel-shadow-hover: 0 16px 34px rgba(28, 67, 66, 0.12);
  min-height: 100%;
  color: var(--prism-text);
  background:
    radial-gradient(circle at 12% 8%, rgba(83, 168, 153, 0.17), transparent 30%),
    radial-gradient(circle at 91% 4%, rgba(225, 175, 74, 0.14), transparent 26%),
    linear-gradient(155deg, var(--prism-bg) 0%, var(--prism-bg-deep) 100%);
  font-family: 'Segoe UI Variable', 'Microsoft YaHei UI', 'PingFang SC', sans-serif;
  overflow-x: hidden;
}

:global(.app-shell:has(.prism-browser) .status-fg) { color: #102a2e; }

.prism-browser__topbar {
  position: sticky;
  z-index: 20;
  top: 0;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  align-items: center;
  min-height: 72px;
  padding: max(10px, env(safe-area-inset-top)) clamp(14px, 3vw, 30px) 10px;
  border-bottom: 1px solid var(--prism-border);
  background: var(--prism-toolbar);
  backdrop-filter: blur(20px) saturate(120%);
}

.prism-browser__home {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 0;
  border-radius: 14px;
  color: var(--prism-text-soft);
  background: transparent;
  cursor: pointer;
}

.prism-browser__top-actions button {
  display: inline-flex;
  min-width: 44px;
  height: 44px;
  padding: 0 13px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 14px;
  color: var(--prism-text-soft);
  background: transparent;
  cursor: pointer;
}

.prism-browser__action-label {
  font-size: 0.76rem;
  font-weight: 760;
}

.prism-browser__home:hover,
.prism-browser__top-actions button:hover,
.prism-browser__top-actions button.is-active {
  color: var(--prism-accent);
  background: var(--prism-hover);
}

.prism-browser__home:focus-visible,
.prism-browser__brand:focus-visible,
.prism-browser__top-actions button:focus-visible,
.prism-question-grid button:focus-visible,
.prism-recent-strip button:focus-visible,
.prism-sources button:focus-visible,
.prism-library button:focus-visible,
.prism-history-toggle input:focus-visible + span,
.prism-web-unavailable button:focus-visible {
  outline: 3px solid var(--prism-focus);
  outline-offset: 2px;
}

.prism-browser__brand {
  display: inline-flex;
  width: fit-content;
  min-width: 0;
  align-items: center;
  gap: 10px;
  padding: 3px 8px;
  border: 0;
  border-radius: 14px;
  color: inherit;
  text-align: left;
  background: transparent;
  cursor: pointer;
}

.prism-browser__brand-mark {
  position: relative;
  display: grid;
  width: 39px;
  height: 39px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 13px;
  color: var(--prism-action-text);
  background: var(--prism-action);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.16);
}

.prism-browser__brand-copy {
  display: grid;
  min-width: 0;
}

.prism-browser__brand-copy strong {
  color: var(--prism-text);
  font-family: Georgia, 'Noto Serif SC', serif;
  font-size: 1rem;
}

.prism-browser__brand-copy small {
  color: var(--prism-muted);
  font-size: 0.66rem;
  letter-spacing: 0.05em;
}

.prism-browser__top-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.prism-browser__main {
  width: min(100%, 1160px);
  min-width: 0;
  margin: 0 auto;
  padding: clamp(20px, 4vw, 48px) clamp(14px, 4vw, 42px) calc(72px + env(safe-area-inset-bottom));
}

.prism-home__masthead {
  position: relative;
  display: grid;
  max-width: 930px;
  min-height: 360px;
  align-content: center;
  margin: 0 auto;
  padding: clamp(36px, 7vw, 76px);
  border: 1px solid var(--prism-border);
  border-radius: 38px;
  background: var(--prism-panel);
  box-shadow: var(--prism-panel-shadow);
  overflow: hidden;
}

.prism-home__masthead::after {
  position: absolute;
  top: -120px;
  right: -100px;
  width: 340px;
  height: 340px;
  border: 64px solid var(--prism-hero-ring);
  border-radius: 50%;
  content: '';
}

.prism-home__signal {
  position: absolute;
  top: 34px;
  right: 38px;
  display: grid;
  gap: 7px;
  transform: rotate(-17deg);
}

.prism-home__signal span {
  display: block;
  width: 54px;
  height: 3px;
  border-radius: 99px;
  background: var(--prism-accent);
  opacity: 0.48;
}

.prism-home__signal span:nth-child(2) { width: 36px; margin-left: 18px; }
.prism-home__signal span:nth-child(3) { width: 20px; margin-left: 34px; }

.prism-home__eyebrow,
.prism-section-heading p,
.prism-home__sources > p,
.prism-library__heading p {
  position: relative;
  z-index: 1;
  margin: 0;
  color: var(--prism-accent-strong);
  font-size: 0.72rem;
  font-weight: 850;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.prism-home__masthead h1 {
  position: relative;
  z-index: 1;
  max-width: 12ch;
  margin: 12px 0 0;
  color: var(--prism-text);
  font-family: Georgia, 'Noto Serif SC', serif;
  font-size: clamp(2.55rem, 7vw, 5.6rem);
  font-weight: 700;
  letter-spacing: -0.045em;
  line-height: 1.02;
}

.prism-home__lede {
  position: relative;
  z-index: 1;
  max-width: 55ch;
  margin: 18px 0 28px;
  color: var(--prism-text-soft);
  font-size: clamp(0.96rem, 2vw, 1.1rem);
  line-height: 1.72;
}

.prism-home__masthead :deep(.prism-search) {
  position: relative;
  z-index: 1;
  max-width: 760px;
}

.prism-home__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 310px;
  gap: 18px;
  margin-top: 18px;
}

.prism-home__start,
.prism-home__sources,
.prism-home__recent,
.prism-library {
  min-width: 0;
  padding: clamp(22px, 4vw, 32px);
  border: 1px solid var(--prism-border);
  border-radius: 24px;
  background: var(--prism-panel);
  box-shadow: var(--prism-panel-shadow);
}

.prism-section-heading h2,
.prism-library__heading h1 {
  margin: 6px 0 0;
  color: var(--prism-text);
  font-family: Georgia, 'Noto Serif SC', serif;
  font-size: clamp(1.25rem, 3vw, 1.7rem);
}

.prism-question-grid {
  display: grid;
  gap: 10px;
  margin-top: 22px;
}

.prism-question-grid button {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  min-width: 0;
  align-items: center;
  gap: 12px;
  min-height: 58px;
  padding: 8px 12px 8px 8px;
  border: 1px solid transparent;
  border-radius: 15px;
  color: var(--prism-text);
  text-align: left;
  background: transparent;
  cursor: pointer;
}

.prism-question-grid button:hover {
  border-color: var(--prism-border);
  background: var(--prism-hover);
}

.prism-question-grid button > span,
.prism-home__sources div > span,
.prism-recent-strip button > span {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 13px;
  color: var(--prism-help-text);
  background: color-mix(in srgb, var(--prism-help) 16%, transparent);
}

.prism-question-grid .is-world,
.prism-home__sources .is-world,
.prism-recent-strip .is-world {
  color: var(--prism-world-text);
  background: color-mix(in srgb, var(--prism-world) 16%, transparent);
}

.prism-home__sources .is-web {
  color: var(--prism-web);
  background: color-mix(in srgb, var(--prism-web) 15%, transparent);
}

.prism-question-grid button strong {
  min-width: 0;
  font-size: 0.9rem;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.prism-question-grid button > i {
  color: var(--prism-muted);
  font-size: 0.76rem;
}

.prism-home__sources {
  display: grid;
  align-content: start;
  gap: 18px;
}

.prism-home__sources > div {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  column-gap: 11px;
  min-width: 0;
  align-items: center;
}

.prism-home__sources > div > span {
  grid-row: span 2;
}

.prism-home__sources strong {
  color: var(--prism-text);
  font-size: 0.86rem;
}

.prism-home__sources small {
  color: var(--prism-muted);
  font-size: 0.72rem;
  line-height: 1.4;
}

.prism-home__recent {
  margin-top: 18px;
}

.prism-recent-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 20px;
}

.prism-recent-strip button {
  display: grid;
  min-width: 0;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--prism-border);
  border-radius: 15px;
  color: var(--prism-text);
  text-align: left;
  background: transparent;
  cursor: pointer;
}

.prism-recent-strip button:hover { background: var(--prism-hover); }
.prism-recent-strip button strong { font-size: 0.84rem; line-height: 1.5; overflow-wrap: anywhere; }

.prism-search-page {
  width: min(100%, 850px);
  margin: 0 auto;
}

.prism-search-page__sticky {
  position: sticky;
  z-index: 8;
  top: 82px;
  padding: 10px;
  border: 1px solid var(--prism-border);
  border-radius: 22px;
  background: var(--prism-toolbar);
  box-shadow: var(--prism-panel-shadow);
  backdrop-filter: blur(20px);
}

.prism-sources {
  display: flex;
  min-width: 0;
  gap: 6px;
  margin-top: 9px;
  overflow-x: auto;
  scrollbar-width: none;
}

.prism-sources::-webkit-scrollbar { display: none; }

.prism-sources button {
  display: inline-flex;
  min-height: 40px;
  flex: 0 0 auto;
  align-items: center;
  gap: 7px;
  padding: 0 13px;
  border: 0;
  border-radius: 12px;
  color: var(--prism-text-soft);
  background: transparent;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 720;
  cursor: pointer;
}

.prism-sources button:hover { background: var(--prism-hover); }
.prism-sources button.is-active { color: var(--prism-action-text); background: var(--prism-action); }
.prism-sources button span { min-width: 21px; padding: 2px 6px; border-radius: 99px; text-align: center; background: rgba(127, 127, 127, 0.14); }
.prism-sources button.is-active span { background: rgba(0, 0, 0, 0.14); }

.prism-search-page__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 24px 4px 12px;
  color: var(--prism-muted);
  font-size: 0.76rem;
}

.prism-search-page__meta p { min-width: 0; margin: 0; color: var(--prism-text-soft); font-weight: 760; overflow-wrap: anywhere; }
.prism-search-page__meta span { flex: 0 0 auto; }

.prism-loading {
  display: flex;
  min-height: 260px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  color: var(--prism-muted);
  font-size: 0.86rem;
}

.prism-loading span { width: 7px; height: 7px; border-radius: 50%; background: var(--prism-accent); animation: prism-pulse 900ms ease-in-out infinite alternate; }
.prism-loading span:nth-child(2) { animation-delay: 150ms; }
.prism-loading span:nth-child(3) { animation-delay: 300ms; margin-right: 5px; }
@keyframes prism-pulse { to { opacity: 0.25; transform: translateY(-4px); } }

.prism-web-unavailable {
  display: grid;
  grid-template-columns: 70px minmax(0, 1fr) auto;
  align-items: center;
  gap: 22px;
  min-height: 220px;
  padding: clamp(24px, 5vw, 42px);
  border: 1px solid var(--prism-border);
  border-radius: 24px;
  background: var(--prism-panel);
}

.prism-web-unavailable__icon { display: grid; width: 70px; height: 70px; place-items: center; border-radius: 22px; color: var(--prism-web); background: color-mix(in srgb, var(--prism-web) 15%, transparent); font-size: 1.5rem; }
.prism-web-unavailable p { margin: 0; color: var(--prism-muted); font-size: 0.8rem; line-height: 1.65; }
.prism-web-unavailable h2 { margin: 4px 0 7px; color: var(--prism-text); font-family: Georgia, 'Noto Serif SC', serif; font-size: 1.35rem; }
.prism-web-unavailable button { min-height: 44px; padding: 0 16px; border: 0; border-radius: 12px; color: var(--prism-action-text); background: var(--prism-action); font: inherit; font-weight: 760; cursor: pointer; }

.prism-library { width: min(100%, 850px); margin: 0 auto; }
.prism-library__heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; margin-bottom: 26px; }
.prism-library__close { display: inline-flex; min-height: 44px; align-items: center; gap: 7px; padding: 0 13px; border: 0; border-radius: 12px; color: var(--prism-text-soft); background: var(--prism-hover); font: inherit; cursor: pointer; }
.prism-library__controls { display: flex; align-items: center; justify-content: space-between; gap: 14px; min-height: 54px; margin-bottom: 12px; padding: 8px 10px; border: 1px solid var(--prism-border); border-radius: 14px; }
.prism-history-toggle { display: flex; min-width: 0; align-items: center; gap: 10px; color: var(--prism-text-soft); font-size: 0.86rem; cursor: pointer; }
.prism-history-toggle input { position: absolute; opacity: 0; pointer-events: none; }
.prism-history-toggle span { position: relative; width: 42px; height: 24px; flex: 0 0 auto; border-radius: 99px; background: var(--prism-border-strong); }
.prism-history-toggle span::after { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: var(--prism-panel); box-shadow: 0 1px 4px rgba(0,0,0,.25); content: ''; transition: transform 160ms ease; }
.prism-history-toggle input:checked + span { background: var(--prism-action); }
.prism-history-toggle input:checked + span::after { transform: translateX(18px); }
.prism-library__clear { min-height: 40px; padding: 0 12px; border: 0; border-radius: 10px; color: var(--prism-warning-text); background: var(--prism-warning-bg); font: inherit; font-size: .8rem; font-weight: 700; cursor: pointer; }
.prism-library__list { display: grid; gap: 8px; }
.prism-library__row { display: grid; grid-template-columns: minmax(0,1fr) 44px; align-items: center; border: 1px solid var(--prism-border); border-radius: 14px; overflow: hidden; }
.prism-library__row-main { display: grid; grid-template-columns: 36px minmax(0,1fr); align-items: center; gap: 8px; min-height: 62px; padding: 8px 10px; border: 0; color: var(--prism-text); text-align: left; background: transparent; cursor: pointer; }
.prism-library__row-main > i { color: var(--prism-accent); }
.prism-library__row-main span { display: grid; min-width: 0; gap: 3px; }
.prism-library__row-main strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.prism-library__row-main small { color: var(--prism-muted); }
.prism-library__remove { display: grid; width: 44px; height: 44px; place-items: center; border: 0; border-radius: 12px; color: var(--prism-muted); background: transparent; cursor: pointer; }
.prism-library__remove:hover { color: var(--prism-warning-text); background: var(--prism-warning-bg); }

@media (max-width: 820px) {
  .prism-home__grid { grid-template-columns: 1fr; }
  .prism-home__sources { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .prism-home__sources > p { grid-column: 1 / -1; }
  .prism-home__sources > div { grid-template-columns: 42px minmax(0,1fr); }
  .prism-recent-strip { grid-template-columns: repeat(2, minmax(0,1fr)); }
}

@media (max-width: 560px) {
  .prism-browser__topbar { grid-template-columns: 44px minmax(0,1fr) auto; min-height: 64px; padding-inline: 8px; }
  .prism-browser__brand { gap: 7px; padding-inline: 3px; }
  .prism-browser__brand-mark { width: 36px; height: 36px; }
  .prism-browser__brand-copy small { display: none; }
  .prism-browser__top-actions { gap: 0; }
  .prism-browser__top-actions button { width: 40px; min-width: 40px; padding: 0; }
  .prism-browser__action-label { display: none; }
  .prism-browser__main { padding-top: 14px; }
  .prism-home__masthead { min-height: 410px; padding: 42px 20px 26px; border-radius: 26px; }
  .prism-home__signal { top: 25px; right: 20px; }
  .prism-home__masthead h1 { max-width: 9ch; font-size: clamp(2.7rem, 15vw, 4.2rem); }
  .prism-home__lede { margin-bottom: 24px; }
  .prism-home__start, .prism-home__sources, .prism-home__recent, .prism-library { padding: 20px; border-radius: 20px; }
  .prism-home__sources { grid-template-columns: 1fr; }
  .prism-home__sources > p { grid-column: auto; }
  .prism-recent-strip { display: flex; margin-right: -20px; padding-right: 20px; overflow-x: auto; scrollbar-width: none; }
  .prism-recent-strip button { width: 190px; flex: 0 0 auto; }
  .prism-search-page__sticky { top: 70px; margin-inline: -4px; padding: 7px; border-radius: 19px; }
  .prism-search-page__meta { align-items: flex-start; flex-direction: column; gap: 4px; padding-top: 18px; }
  .prism-web-unavailable { grid-template-columns: 1fr; justify-items: start; gap: 16px; }
  .prism-web-unavailable button { width: 100%; }
  .prism-library__heading { align-items: center; }
  .prism-library__close span { display: none; }
  .prism-library__controls { align-items: stretch; flex-direction: column; }
  .prism-library__clear { width: 100%; }
}

@media (prefers-reduced-motion: reduce) {
  .prism-browser *,
  .prism-browser *::before,
  .prism-browser *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
