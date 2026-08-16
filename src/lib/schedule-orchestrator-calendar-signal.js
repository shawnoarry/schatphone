const calendarSnapshotListeners = new Set()

export const notifyScheduleOrchestratorCalendarChanged = () => {
  calendarSnapshotListeners.forEach((listener) => listener())
}

export const subscribeScheduleOrchestratorCalendarChanges = (listener) => {
  if (typeof listener !== 'function') return () => {}
  calendarSnapshotListeners.add(listener)
  return () => calendarSnapshotListeners.delete(listener)
}
