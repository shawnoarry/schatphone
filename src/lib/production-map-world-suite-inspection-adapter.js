import { listChatMapPackReferences } from './chat-map-pack-reference-projection'
import { createMapWorldSuiteInspectionAdapter } from './map-world-suite-inspection'
import { listSimulationMapPackReferences } from './simulation/map-pack-reference-projection'

const requireStoreMethod = (store, methodName, owner) => {
  if (!store || typeof store[methodName] !== 'function') {
    throw new TypeError(`${owner} Store with ${methodName} is required.`)
  }
}

export const createProductionMapWorldSuiteInspectionAdapter = ({
  mapStore,
  galleryStore,
  simulationStore,
  chatStore,
  mutationAdapterAvailable = false,
} = {}) => {
  requireStoreMethod(mapStore, 'createBackupSnapshot', 'Map')
  requireStoreMethod(galleryStore, 'createBackupSnapshot', 'Gallery')
  requireStoreMethod(simulationStore, 'createBackupSnapshot', 'Simulation')
  if (
    !chatStore ||
    !chatStore.messagesByConversation ||
    typeof chatStore.messagesByConversation !== 'object'
  ) {
    throw new TypeError('Chat Store with messagesByConversation is required.')
  }

  return createMapWorldSuiteInspectionAdapter({
    mapStore,
    listGalleryAssets: () =>
      (galleryStore.createBackupSnapshot().assets || []).map((asset) => ({ id: asset?.id })),
    listExternalReferences: () => {
      const simulationSnapshot = simulationStore.createBackupSnapshot()
      return [
        ...listSimulationMapPackReferences(simulationSnapshot),
        ...listChatMapPackReferences({
          messagesByConversation: chatStore.messagesByConversation,
        }),
      ]
    },
    mutationAdapterAvailable,
  })
}
