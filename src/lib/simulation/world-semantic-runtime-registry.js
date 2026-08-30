export const WORLD_SEMANTIC_RUNTIME_REGISTRY = Object.freeze({
  schemaVersion: 1,
  registryVersion: 'world-semantic-runtime-v1',
  capabilityIds: Object.freeze([
    'runtime:access:restricted_place',
  ]),
  ownerModules: Object.freeze([
    Object.freeze({
      id: 'map',
      actionIds: Object.freeze([
        'map:access:validate',
      ]),
    }),
  ]),
})
