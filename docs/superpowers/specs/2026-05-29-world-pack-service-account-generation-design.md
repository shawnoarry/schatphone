# World Pack Service Account Generation Design

Updated: 2026-05-29

Status: `IMPLEMENTED_V1`

Implementation note:

- Active World Pack service-account templates can now be generated into Chat Directory after user confirmation.
- Generated contacts persist `worldPackId`, `worldServiceTemplateId`, and `worldAppBindingId` origin metadata.
- Repeated generation returns the existing contact instead of creating duplicates.
- This does not create source-module business records or automatic push schedules.

## Goal

Turn active World Pack service-account templates into usable Chat Directory entries, with an explicit user confirmation step.

User-facing outcome:

1. A user activates a World Pack in `Settings -> WorldBook`.
2. WorldBook shows the active pack's service-account templates.
3. The user can create each suggested service account or official account into Chat Directory.
4. Generated entries can be opened in Chat.
5. Re-running the action does not create duplicates.

## Product Boundary

World Pack owns the template suggestion.

Chat Directory owns the created service account or official account.

Chat owns the conversation and messages.

Source modules still own business records. A generated account may bind to an existing module service key, such as Shopping or Food Delivery, but it must not create orders, deliveries, schedules, wallet records, or runtime events by itself.

## V1 Scope

Included:

- pure mapping from active World Pack service template to Chat Directory contact payload;
- generated contact metadata for `worldPackId`, `worldServiceTemplateId`, and `worldAppBindingId`;
- duplicate detection by active pack id plus service template id;
- WorldBook UI for reviewing and generating template-backed service accounts;
- tests for pure mapping, Chat store persistence, WorldBook UI, and one e2e setup flow.

Deferred:

- user-authored World Pack templates;
- multi-step service-account setup wizard;
- AI/regex parsing rules;
- automatic subscription or push schedule creation;
- concrete app-archetype behavior beyond safe module binding metadata;
- creating or mutating source-module business records.

## Information Architecture

The Current World Pack panel keeps the same progressive structure:

- L0: active pack and what is currently in effect.
- L1: activation review for the selected pack.
- L2: active pack service templates, shown only after a pack is active.
- L3: create a Chat Directory entry from one template.

The service-template area should answer:

- what service or official account will appear;
- where it comes from;
- which existing module capability it may bind to;
- whether it is already generated;
- what happens after generation.

## Data Shape

Generated Chat Directory contacts add optional metadata:

```js
{
  worldPackId: 'survival_city',
  worldServiceTemplateId: 'survival_supply_dispatch',
  worldAppBindingId: 'survival_supply_board'
}
```

These fields identify the template origin. They do not make the contact a role profile and do not replace Chat Directory ownership.

## Acceptance

The feature is acceptable when:

- a pure helper can build a Chat contact payload from an active pack service template;
- `chatStore.findWorldServiceTemplateContact(packId, templateId)` finds an existing generated contact;
- `chatStore.createWorldServiceTemplateContact(payload)` creates one contact and returns the existing one on repeated calls;
- WorldBook shows active-pack service templates with generated/not-generated state;
- clicking create adds a Chat Directory service/official account and exposes an "open Chat" action;
- existing service notification behavior for Shopping, Logistics, and Food Delivery still passes;
- desktop and mobile WorldBook views remain readable.
