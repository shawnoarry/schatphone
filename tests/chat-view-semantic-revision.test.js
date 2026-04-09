import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import ChatView from '../src/views/ChatView.vue'
import { useChatStore } from '../src/stores/chat'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/chat', component: DummyView },
      { path: '/chat/:id', component: ChatView },
      { path: '/home', component: DummyView },
      { path: '/gallery', component: DummyView },
      { path: '/map', component: DummyView },
      { path: '/wallet', component: DummyView },
      { path: '/network', component: DummyView },
      { path: '/chat-feature/:feature', component: DummyView },
    ],
  })

const findButtonByText = (wrapper, text) =>
  wrapper.findAll('button').find((button) => button.text().includes(text))

const openFirstAssistantActionSheet = async (wrapper) => {
  const bubble = wrapper.find('.chat-bubble-assistant')
  expect(bubble.exists()).toBe(true)
  await bubble.trigger('contextmenu')
  await nextTick()
}

describe('chat view semantic revision flow', () => {
  let wrapper = null
  let chatStore = null

  beforeEach(async () => {
    localStorage.clear()
    setActivePinia(createPinia())
    const router = createTestRouter()
    await router.push('/chat/1')
    await router.isReady()
    wrapper = mount(ChatView, {
      global: {
        plugins: [router],
      },
    })
    chatStore = useChatStore()
    await nextTick()
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
    wrapper = null
    chatStore = null
  })

  test('supports edit modal save and restore flow for assistant message', async () => {
    const targetBefore = chatStore.getMessagesByContactId(1).find((item) => item.role === 'assistant')
    expect(targetBefore).toBeTruthy()
    const originalText = targetBefore.content
    const revisedText = `${originalText}（修订测试）`

    await openFirstAssistantActionSheet(wrapper)
    const editButton = findButtonByText(wrapper, '编辑')
    expect(editButton).toBeTruthy()
    await editButton.trigger('click')
    await nextTick()

    const editModalTextarea = wrapper.find('textarea')
    expect(editModalTextarea.exists()).toBe(true)
    await editModalTextarea.setValue(revisedText)
    await nextTick()

    const saveButton = findButtonByText(wrapper, '保存')
    expect(saveButton).toBeTruthy()
    expect(saveButton.attributes('disabled')).toBeUndefined()
    await saveButton.trigger('click')
    await nextTick()

    const targetAfterSave = chatStore
      .getMessagesByContactId(1)
      .find((item) => item.id === targetBefore.id)
    expect(targetAfterSave?.semanticRevision?.revisedText).toBe(revisedText)
    expect(targetAfterSave?.content).toBe(revisedText)

    await openFirstAssistantActionSheet(wrapper)
    const restoreButton = findButtonByText(wrapper, '恢复原文')
    expect(restoreButton).toBeTruthy()
    await restoreButton.trigger('click')
    await nextTick()

    const targetAfterRestore = chatStore
      .getMessagesByContactId(1)
      .find((item) => item.id === targetBefore.id)
    expect(targetAfterRestore?.semanticRevision).toBe(null)
    expect(targetAfterRestore?.content).toBe(originalText)
  })

  test('shows consistent edit-modal validation hints and disabled save state', async () => {
    const target = chatStore.getMessagesByContactId(1).find((item) => item.role === 'assistant')
    expect(target).toBeTruthy()
    const originalText = target.content

    await openFirstAssistantActionSheet(wrapper)
    const editButton = findButtonByText(wrapper, '编辑')
    expect(editButton).toBeTruthy()
    await editButton.trigger('click')
    await nextTick()

    const textarea = wrapper.find('textarea')
    expect(textarea.exists()).toBe(true)

    const saveButton = () => findButtonByText(wrapper, '保存')

    expect(wrapper.text()).toContain('文本未变化')
    expect(saveButton()?.attributes('disabled')).toBeDefined()

    await textarea.setValue('   ')
    await nextTick()
    expect(wrapper.text()).toContain('消息不能为空')
    expect(saveButton()?.attributes('disabled')).toBeDefined()

    await textarea.setValue('x'.repeat(3001))
    await nextTick()
    expect(wrapper.text()).toContain('文本不能超过 3000 字')
    expect(saveButton()?.attributes('disabled')).toBeDefined()

    await textarea.setValue(`${originalText}#`)
    await nextTick()
    expect(wrapper.text()).toContain('修订后文本将作为后续上下文')
    expect(saveButton()?.attributes('disabled')).toBeUndefined()
  })
})

