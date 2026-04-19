import { describe, expect, it } from 'vitest'
import {
  resetDialogServiceForTest,
  useDialog,
} from '../src/composables/useDialog'

describe('dialog service', () => {
  it('opens and resolves confirm dialogs', async () => {
    resetDialogServiceForTest()
    const { dialogState, confirmDialog, submitDialog } = useDialog()

    const resultPromise = confirmDialog({
      title: 'Delete asset',
      message: 'Confirm delete?',
    })

    expect(dialogState.visible).toBe(true)
    expect(dialogState.kind).toBe('confirm')
    expect(dialogState.title).toBe('Delete asset')

    submitDialog()

    await expect(resultPromise).resolves.toBe(true)
    expect(dialogState.visible).toBe(false)
  })

  it('validates prompt input before submit', async () => {
    resetDialogServiceForTest()
    const { dialogState, promptDialog, submitDialog, setDialogInputValue } = useDialog()

    const resultPromise = promptDialog({
      title: 'Rename',
      inputRequired: true,
      inputRequiredMessage: 'Name is required.',
      initialValue: '',
    })

    expect(dialogState.visible).toBe(true)
    expect(dialogState.kind).toBe('prompt')
    expect(dialogState.inputError).toBe('Name is required.')

    submitDialog()
    expect(dialogState.visible).toBe(true)

    setDialogInputValue('New name')
    expect(dialogState.inputError).toBe('')

    submitDialog()

    await expect(resultPromise).resolves.toBe('New name')
    expect(dialogState.visible).toBe(false)
  })

  it('queues dialogs and opens the next one after settle', async () => {
    resetDialogServiceForTest()
    const { dialogState, confirmDialog, submitDialog } = useDialog()

    const firstPromise = confirmDialog({ title: 'First confirm' })
    const secondPromise = confirmDialog({ title: 'Second confirm' })

    expect(dialogState.title).toBe('First confirm')

    submitDialog()
    await expect(firstPromise).resolves.toBe(true)

    expect(dialogState.visible).toBe(true)
    expect(dialogState.title).toBe('Second confirm')

    submitDialog()
    await expect(secondPromise).resolves.toBe(true)
    expect(dialogState.visible).toBe(false)
  })
})
