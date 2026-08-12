import { EVENT_INSTANCE_LIFECYCLE } from './event-contracts'
import { MAP_JOURNEY_EVENT_PROPOSAL_STATUS } from './adapters/map-journey-events'

const normalizeId = (value, maxLength = 180) =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : ''

export const listSimulationMapPackReferences = ({
  eventInstances = [],
  mapJourneyEventProposals = [],
} = {}) => {
  const references = []

  ;(Array.isArray(eventInstances) ? eventInstances : []).forEach((instance) => {
    const mapPackId = normalizeId(instance?.world?.mapPackId, 120)
    const referenceId = normalizeId(instance?.id)
    if (!mapPackId || !referenceId) return
    references.push({
      owner: 'event_runtime',
      kind: 'event_instance',
      referenceId,
      mapPackId,
      active: instance?.lifecycle === EVENT_INSTANCE_LIFECYCLE.ACTIVE,
    })
  })

  ;(Array.isArray(mapJourneyEventProposals) ? mapJourneyEventProposals : []).forEach(
    (proposal) => {
      const mapPackId = normalizeId(proposal?.source?.mapPackId, 120)
      const referenceId = normalizeId(proposal?.id)
      if (!mapPackId || !referenceId) return
      references.push({
        owner: 'event_runtime',
        kind: 'map_journey_event_proposal',
        referenceId,
        mapPackId,
        active: proposal?.status === MAP_JOURNEY_EVENT_PROPOSAL_STATUS.PENDING_REVIEW,
      })
    },
  )

  return references
}
