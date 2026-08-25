import { resolveMailScheduleHandoffDraftV1 } from './mail-shell-data'

const SOURCE_RESOLVERS = Object.freeze({
  mail: resolveMailScheduleHandoffDraftV1,
})

export const resolveScheduleHandoffSourceDraftV1 = ({ sourceOwner, sourceRecordId } = {}) => {
  const owner = typeof sourceOwner === 'string' ? sourceOwner.trim().toLowerCase() : ''
  const resolver = SOURCE_RESOLVERS[owner]
  return resolver ? resolver(sourceRecordId) : null
}
