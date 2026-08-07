import { expect, test } from '@playwright/test'
import { unlockToHome } from './helpers/navigation'

const readOwnerLayers = (page, keys) =>
  page.evaluate(async (ownerKeys) => {
    const persistence = await import('/schatphone/src/lib/persistence')
    return Object.fromEntries(
      await Promise.all(
        ownerKeys.map(async (key) => [key, await persistence.readPersistedRawLayers(key)]),
      ),
    )
  }, keys)

test.describe('same-container current-save writer', () => {
  test.skip(({ browserName }) => browserName !== 'chromium')
  test.setTimeout(45_000)

  test('keeps the later page read-only and retries only unchanged owner heads', async ({
    page: firstPage,
    context,
  }) => {
    await unlockToHome(firstPage)
    const secondPage = await context.newPage()
    await unlockToHome(secondPage)

    const recovery = secondPage.getByTestId('persistence-recovery-sheet')
    await expect(recovery).toBeVisible()
    await expect(recovery).toHaveAttribute('data-mode', 'read_only')
    await expect(recovery).toContainText('当前存档已进入只读保护')

    const blockedKeys = ['store:wallet', 'store:phone']
    const beforeBlockedWrites = await readOwnerLayers(secondPage, blockedKeys)
    const blockedActions = await secondPage.evaluate(async () => {
      const [{ useWalletStore }, { usePhoneStore }] = await Promise.all([
        import('/schatphone/src/stores/wallet.js'),
        import('/schatphone/src/stores/phone.js'),
      ])
      const wallet = useWalletStore()
      const phone = usePhoneStore()
      const currency = wallet.setPrimaryCurrency('USD')
      const call = phone.addCallLog({
        contactName: 'Second Page',
        sourceModule: 'same_container_writer_test',
        sourceId: 'second-page-phone',
      })
      wallet.saveNow()
      phone.saveNow()
      return {
        currency,
        callSourceId: call?.sourceId,
      }
    })
    const afterBlockedWrites = await readOwnerLayers(secondPage, blockedKeys)

    expect(blockedActions).toEqual({
      currency: 'USD',
      callSourceId: 'second-page-phone',
    })
    expect(afterBlockedWrites).toEqual(beforeBlockedWrites)

    await firstPage.evaluate(async () => {
      const { useStockStore } = await import('/schatphone/src/stores/stock.js')
      const stock = useStockStore()
      stock.upsertStock({
        symbol: 'WRTR',
        name: 'Writer Page',
        price: 12.34,
        changePercent: 1,
        sourceModule: 'same_container_writer_test',
        sourceId: 'first-page-stock',
      })
      stock.saveNow()
    })
    await expect
      .poll(async () => {
        const layers = (await readOwnerLayers(firstPage, ['store:stock']))['store:stock']
        return Boolean(layers.localRaw && layers.localRaw === layers.mirrorRaw)
      })
      .toBe(true)
    const firstPageStockLayers = await readOwnerLayers(firstPage, ['store:stock'])

    await firstPage.close()
    await secondPage.getByTestId('persistence-recovery-retry').click()
    await expect(recovery).toBeHidden()

    await expect
      .poll(async () => {
        const layers = await readOwnerLayers(secondPage, blockedKeys)
        return blockedKeys.every(
          (key) =>
            layers[key].localRaw && layers[key].localRaw === layers[key].mirrorRaw,
        )
      })
      .toBe(true)

    const retriedData = await secondPage.evaluate((keys) =>
      Object.fromEntries(
        keys.map((key) => {
          const raw = localStorage.getItem(`schatphone:${key}`)
          return [key, raw ? JSON.parse(raw).data : null]
        }),
      ), blockedKeys)
    expect(retriedData['store:wallet'].primaryCurrency).toBe('USD')
    expect(
      retriedData['store:phone'].calls.some(
        (call) => call.sourceId === 'second-page-phone',
      ),
    ).toBe(true)

    await secondPage.evaluate(async () => {
      const { useStockStore } = await import('/schatphone/src/stores/stock.js')
      const stock = useStockStore()
      stock.upsertStock({
        symbol: 'STAL',
        name: 'Stale Page',
        price: 56.78,
        changePercent: 1,
        sourceModule: 'same_container_writer_test',
        sourceId: 'stale-second-page-stock',
      })
      stock.saveNow()
    })
    expect(await readOwnerLayers(secondPage, ['store:stock'])).toEqual(firstPageStockLayers)
    await expect(recovery).toBeVisible()
    await expect(recovery).toHaveAttribute('data-mode', 'read_only')
  })
})
