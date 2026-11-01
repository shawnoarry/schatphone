import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

const originalDetail = '我不喜欢医院的消毒水味。'
const laterDetail = '去诊所时我会紧张，希望有人陪我。'
const otherRoleDetail = '我去医院时喜欢戴着红色耳机。'
const recentDetail = '傍晚散步时我会带一把蓝色雨伞。'
const question = '还记得我为什么不喜欢医院的消毒水味吗？'

test('recent conversation and explicitly remembered details survive reopening without crossing roles', async ({ page }, testInfo) => {
  const requests = []
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.addInitScript(() => {
    if (localStorage.getItem('e2e:chat-memory-seeded')) return
    const profiles = [
      { id: 41, roleId: '9401', name: '朝雨', bio: 'A_PERSONA 温和的插画师' },
      { id: 42, roleId: '9402', name: '南星', bio: 'B_PERSONA 活泼的花店店员' },
    ].map((profile) => ({ ...profile, role: '邻居', entityType: 'main_role', isMain: true, revision: 1 }))
    localStorage.setItem('schatphone:store:system', JSON.stringify({ version: 1, savedAt: Date.now(), data: {
      settings: {
        system: { language: 'zh-CN' },
        api: { url: 'https://chat-memory.provider.test/v1/chat/completions', key: 'e2e_fake_memory_key', model: 'memory-test-model' },
      },
      user: { name: '记忆验收用户', encyclopediaEntries: [], knowledgePoints: [], worldBookSourceLinks: [] },
    } }))
    localStorage.setItem('schatphone:store:chat', JSON.stringify({ version: 2, savedAt: Date.now(), data: {
      roleProfiles: profiles,
      contacts: profiles.map((profile) => ({ id: profile.id, profileId: profile.id, name: profile.name, kind: 'role' })),
      conversations: Object.fromEntries(profiles.map((profile) => [profile.id, {
        id: `memory_conv_${profile.id}`, contactId: profile.id, aiPrefs: { contextTurns: 2, autoInvokeEnabled: false },
      }])),
      messagesByConversation: {},
    } }))
    localStorage.setItem('e2e:chat-memory-seeded', '1')
  })
  await page.route('https://chat-memory.provider.test/**', async (route) => {
    const payload = route.request().postDataJSON()
    requests.push(payload.messages)
    const prompt = String(payload.messages[0]?.content || '')
    const remembered = prompt.includes(originalDetail) && prompt.includes(laterDetail.normalize('NFKC'))
    const reply = remembered ? '我记得你不喜欢消毒水味，去诊所也希望有人陪。' : '我在听，会接着刚才的话题聊。'
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ messages: [{ delayMs: 0,
        blocks: [{ type: 'text', text: `${reply}（验收 ${requests.length}）` }],
      }] }) } }],
    }) })
  })

  const openThread = async (id) => {
    await navigateInsideUnlockedApp(page, '/chat')
    await page.getByTestId(`chat-contact-row-${id}`).click()
    await expect(page.getByTestId('chat-message-input')).toBeVisible()
  }
  const send = async (text) => {
    await page.getByTestId('chat-message-input').fill(text)
    await page.getByTestId('chat-message-input').press('Enter')
    await expect(page.getByTestId(/^chat-message-row-/).filter({ hasText: text }).last()).toBeVisible()
  }
  const remember = async (text) => {
    await page.getByTestId(/^chat-message-row-/).filter({ hasText: text }).last()
      .getByTestId('chat-message-bubble').click({ button: 'right' })
    await page.getByTestId('chat-message-action-remember').click()
    await expect(page.getByTestId('chat-message-action-remember')).toBeHidden()
  }
  const reply = async (count) => {
    await page.getByTestId('chat-trigger-reply').click()
    await expect(page.getByText(new RegExp(`（验收 ${count}）`))).toBeVisible()
    expect(requests).toHaveLength(count)
    return requests[count - 1]
  }
  const readStored = () => page.evaluate(() => ({
    chat: JSON.parse(localStorage.getItem('schatphone:store:chat') || '{}').data,
    runtime: JSON.parse(localStorage.getItem('schatphone:store:relationship-runtime') || '{}').data,
  }))

  await unlockToHome(page)
  await openThread(42)
  await send(otherRoleDetail)
  await remember(otherRoleDetail)
  await openThread(41)
  await send(recentDetail)
  const first = await reply(1)
  expect(JSON.stringify(first.slice(1))).toContain(recentDetail)
  await page.reload()
  await unlockToHome(page)
  await openThread(41)
  await send('接着刚才的散步计划聊吧。')
  const resumed = await reply(2)
  expect(JSON.stringify(resumed.slice(1))).toContain(recentDetail)
  expect(JSON.stringify(resumed.slice(1))).toContain('验收 1')
  expect(resumed[0].content).toContain('A_PERSONA')
  expect(resumed[0].content).not.toContain('B_PERSONA')
  expect(JSON.stringify(resumed)).not.toContain(otherRoleDetail)

  await send(originalDetail)
  await remember(originalDetail)
  await remember(originalDetail)
  await send(laterDetail)
  await remember(laterDetail)
  for (const detail of ['我喜欢深绿色的围巾。', '我习惯周末练习钢琴。', '我喜欢抹茶蛋糕。']) {
    await send(detail)
    await remember(detail)
  }
  for (let index = 0; index < 7; index += 1) await send(`窗边的光线很好，随便聊聊 ${index}。`)
  await send(question)
  const remembered = await reply(3)
  expect(JSON.stringify(remembered.slice(1))).not.toContain(originalDetail)
  expect(JSON.stringify(remembered.slice(1))).not.toContain(laterDetail)
  expect(remembered[0].content).toContain(originalDetail)
  expect(remembered[0].content).toContain(laterDetail.normalize('NFKC'))
  expect(remembered[0].content).not.toContain(otherRoleDetail)
  await expect.poll(async () => (await readStored()).runtime?.events?.length).toBe(6)
  const beforeReload = await readStored()
  expect(beforeReload.runtime.events.filter((event) => event.entityKey === 'role:41' &&
    event.memoryKey === 'chat_disclosure__hospital')).toHaveLength(2)
  expect(beforeReload.runtime.events.every((event) => event.effectApplied === false)).toBe(true)

  await page.reload()
  await unlockToHome(page)
  await openThread(41)
  await send(question)
  const reloaded = await reply(4)
  expect(reloaded[0].content).toContain(originalDetail)
  expect(reloaded[0].content).toContain(laterDetail.normalize('NFKC'))
  expect(reloaded[0].content).not.toContain(otherRoleDetail)
  await page.screenshot({ path: testInfo.outputPath('remembered-after-reopen.png'), fullPage: true })

  await openThread(42)
  await send('我去医院时会带什么？')
  const otherRole = await reply(5)
  expect(otherRole[0].content).toContain(otherRoleDetail)
  expect(otherRole[0].content).toContain('B_PERSONA')
  expect(JSON.stringify(otherRole)).not.toContain(originalDetail)
  expect(JSON.stringify(otherRole)).not.toContain(laterDetail.normalize('NFKC'))
  const final = await readStored()
  expect(final.runtime.events).toHaveLength(6)
  expect(JSON.stringify(final.chat.messagesByConversation)).toContain(originalDetail)
  expect(JSON.stringify(final.chat.messagesByConversation)).toContain(recentDetail)
  expect(pageErrors).toEqual([])
})
