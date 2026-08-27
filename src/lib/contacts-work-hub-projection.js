import { buildContactsProfileProjection } from './contacts-profile-projection'
import {
  CONTACTS_ENTITY_TYPES,
  PROFILE_TEMPLATE_FIELD_PURPOSES,
} from './profile-template-schema'

const WORK_FIELD_IDS = Object.freeze(['occupation', 'affiliation', 'team_role', 'public_identity'])
const ROLE_TEMPLATE_BY_TOKEN = Object.freeze({
  artist: 'artist',
  idol: 'artist',
  singer: 'artist',
  manager: 'manager',
  assistant: 'assistant',
  producer: 'producer',
  employee: 'employee',
  staff: 'employee',
  student: 'student',
})

const normalizeToken = (value) =>
  String(Array.isArray(value) ? value[0] || '' : value || '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()

export const buildContactsWorkHubProjection = ({
  profile,
  template,
  expectedWorldId,
  expectedProfileRevision,
} = {}) => {
  const result = buildContactsProfileProjection({
    purpose: PROFILE_TEMPLATE_FIELD_PURPOSES.WORK_HUB_MATCHING,
    profile,
    template,
    expectedWorldId,
    expectedProfileRevision,
    allowedEntityTypes: [
      CONTACTS_ENTITY_TYPES.SELF_PROFILE,
      CONTACTS_ENTITY_TYPES.MAIN_ROLE,
      CONTACTS_ENTITY_TYPES.SUPPORTING_ROLE,
      CONTACTS_ENTITY_TYPES.NPC,
    ],
    allowedVisibilityLevels: new Set(['public', 'familiar', 'world_specific']),
    allowedFieldIds: WORK_FIELD_IDS,
  })
  if (!result.ok) return result

  const values = Object.fromEntries(
    result.projection.fields.map((field) => [field.fieldId, field.value]),
  )
  const occupationToken = normalizeToken(values.occupation)
  const roleTemplateId = ROLE_TEMPLATE_BY_TOKEN[occupationToken] || ''
  const isSelfProfile = profile.entityType === CONTACTS_ENTITY_TYPES.SELF_PROFILE
  return Object.freeze({
    ok: true,
    reason: 'projected',
    projection: Object.freeze({
      ...result.projection,
      occupation: values.occupation || '',
      affiliation: values.affiliation || '',
      role: values.team_role || values.public_identity || '',
      roleTemplateId,
      evidenceKind: isSelfProfile ? 'self_reported_matching_clue' : 'confirmed_role_identity',
      authority: Object.freeze({
        membershipGranted: false,
        credentialIssued: false,
        publishingGranted: false,
        organizationActionAllowed: false,
        requiresOrganizationOwnerValidation: true,
      }),
    }),
  })
}
