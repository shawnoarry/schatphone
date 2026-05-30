# Book And WorldBook Onboarding Redesign

Updated: 2026-05-30

Status: `APPROVED_FOR_PLANNING`

## 1. Decision

Book and WorldBook should keep separate responsibilities, but the first-use path must become guided.

Approved direction:

1. `Book` is the long-form text library.
2. `Settings -> WorldBook` is the activation and world-context control panel.
3. First-time WorldBook setup should use a lightweight onboarding flow instead of dropping the user into the full control panel.
4. Long-term use should become `Book` as library plus `WorldBook` as control panel.
5. Built-in or Settings-owned worldview text must not automatically appear as a Book library asset.
6. A Settings-owned worldview may offer an explicit `Export / Copy to Book` action that creates a user-owned editable copy.
7. Import, export, activation, and other high-impact flows should use dialogs, drawers, or explicit confirmation steps instead of piling all controls into the main screen.

Short version:

> Book stores user-owned text. WorldBook chooses what is active. First use explains the path. System fallback text stays outside Book until the user copies it.

## 2. Problem

The current V1 implementation is technically connected but difficult to use.

Current symptoms:

- Book behaves like a raw CRUD editor rather than a text library.
- WorldBook is too dense: active world state, Book source links, global worldview text, World Pack, role templates, knowledge points, source diff review, and source activation all live in one long page.
- Users cannot quickly tell the difference between storing a document and activating world context.
- Users may not understand which material is affecting Chat or runtime.
- Settings-owned built-in/default worldview text can be confused with user-owned Book assets if it is presented as ordinary library material.
- Same-screen stacking makes pages feel worse as lists grow. Book, WorldBook, and App Store should not keep adding import forms, export controls, detail panels, and long lists into one endlessly lengthening screen.

## 3. Product Boundaries

### 3.1 Book

Book owns user-created or user-imported reusable text.

Book should contain:

- imported worldbook documents;
- user-created worldbook drafts;
- knowledge notes;
- rule sets;
- terminology or glossary notes;
- reference text;
- exported copies of Settings-owned worldview text after the user explicitly requests a copy.

Book should not automatically contain:

- built-in system worldview text;
- Settings fallback worldview text;
- active world state;
- World Pack activation state;
- Chat history;
- runtime event truth;
- system-owned sample material unless copied by the user.

### 3.2 Settings -> WorldBook

WorldBook owns activation and governance.

WorldBook should answer:

1. What world is active now?
2. Which sources define it?
3. Where will this affect the app?
4. What needs review before this context is trusted?

WorldBook may keep a short Settings-owned fallback worldview field, but this field is not a Book asset by default.

### 3.3 System Fallback Worldview

The built-in or Settings-owned worldview is a system fallback source.

Rules:

- It appears in WorldBook as `System fallback` or equivalent user-facing copy.
- It does not appear in the Book library list.
- It does not count as a Book source.
- It can be used when no Book source is linked.
- It can be copied/exported to Book by explicit user action.
- After copying to Book, the new Book asset is user-owned and editable.
- The copied Book asset does not stay automatically synced with the Settings fallback text.

This prevents Book from feeling prefilled with system material while still allowing users to customize the built-in default.

## 4. User Model

The user should understand three places:

1. `Book`: where my reusable texts live.
2. `Settings -> WorldBook`: what is currently active.
3. Chat/runtime: where the active context is consumed.

The main distinction:

- Saving in Book means the text exists.
- Enabling in WorldBook means the text can affect AI context.

## 5. First-Time WorldBook Flow

When WorldBook has no linked Book source and no meaningful user-configured world state, show a guided setup surface before the full control panel.

Recommended steps:

1. Choose setup source:
   - use current system fallback;
   - choose from Book;
   - import new text into Book;
   - create a new Book document.
2. Confirm text type:
   - worldbook document;
   - rule set;
   - knowledge note;
   - glossary / terminology;
   - reference note.
3. Choose activation scope:
   - whole document;
   - selected sections when available.
4. Preview impact:
   - Chat;
   - event runtime;
   - role/profile templates when relevant;
   - module context surfaces.
5. Confirm activation.

After completion, WorldBook returns to the normal control panel.

The onboarding should be lightweight and reversible. It should not become a separate world store, paid DLC metaphor, or heavy wizard.

## 6. Long-Term Book Structure

Book should become a library-first app.

Primary surfaces:

1. Library list
   - search;
   - type filters;
   - tags;
   - active-source state;
   - locked state;
   - recent update state.
2. Asset detail
   - read mode by default;
   - section outline for long documents;
   - active WorldBook usage summary;
   - explicit edit action.
3. Editor
   - explicit save and cancel;
   - large-text friendly layout;
   - active-source edit guard;
   - version snapshot behavior.
4. Import/export
   - `.txt`, `.md`, `.markdown`, `.json`, `.worldbook.json`;
   - export one asset;
   - unsupported format feedback;
   - use a dialog or drawer for import options, file confirmation, export format, overwrite warnings, and final confirmation;
   - keep the main library screen focused on browsing and selecting assets, not permanent import/export forms.

Book should not feel like a Settings sub-panel. It should feel like a native phone app dedicated to user-owned text material.

## 7. Long-Term WorldBook Structure

WorldBook should become state-first and lighter.

Recommended order:

1. Active world summary
   - active world name;
   - active source count;
   - system fallback state;
   - warnings.
2. Active sources
   - Book source links;
   - enabled/disabled state;
   - changed/missing warnings;
   - review changes;
   - open in Book.
3. First-use or empty-state actions
   - choose from Book;
   - import into Book;
   - use system fallback;
   - copy system fallback to Book.
4. Impact preview
   - Chat;
   - runtime;
   - Contacts/profile templates;
   - relevant module consumers.
5. Advanced management
   - World Pack;
   - global fallback worldview;
   - knowledge points;
   - role-profile templates.

The global fallback editor should be treated as an advanced or secondary path once Book source activation exists.

## 8. Copy To Book Behavior

WorldBook should expose a clear action for Settings-owned worldview text:

Recommended label:

- `Copy to Book`
- Chinese UI direction: `复制到文本库`

Behavior:

1. Create a new Book asset from the current fallback worldview text.
2. Use asset type `worldbook_document` unless the implementation has a better explicit type.
3. Mark the new asset as `draft`, not `active_source`, until the user links or activates it.
4. Include source metadata showing it came from the Settings fallback.
5. Navigate to Book detail or show a success action: `Open in Book`.
6. Do not overwrite the original Settings fallback.
7. Do not auto-sync future edits between the fallback and the copied asset.

This makes the action feel like duplication for customization, not migration.

## 9. Progressive Disclosure Rules

Book, WorldBook, and App Store should use progressive disclosure as their lists grow.

Main screen responsibilities:

- show overview state;
- show searchable/filterable lists;
- show the selected item summary;
- expose primary entry points into deeper actions.

Do not use the main screen for:

- full import configuration;
- full export configuration;
- destructive confirmations;
- long source pickers;
- detailed change review;
- every possible action for every item.

Preferred containers:

1. Dialog
   - import confirmation;
   - export confirmation;
   - delete or remove confirmations;
   - short activation confirmations.
2. Drawer or bottom sheet
   - source picker;
   - section picker;
   - item detail on phone-sized screens;
   - source diff preview.
3. Dedicated page
   - long-form editing;
   - full library management;
   - advanced WorldBook management;
   - large App Store category or app-detail surfaces if the list becomes too long.

Cross-surface rule:

- If a list can reasonably grow past one phone screen, its item details and execution controls should not all live inline.
- App Store's current same-screen list/detail/action layout is acceptable only as a V1 baseline. If app entries, categories, screenshots, or descriptions grow, App Store should move app detail into a drawer, modal detail, or dedicated route instead of stretching the same page.
- Book import/export should open a confirmation surface. The main Book screen should not become a stack of search, filters, import controls, export controls, editor, diff, and feedback all at once.

## 10. Interaction Consistency

Use a consistent depth model.

L0 overview:

- active world summary;
- warnings;
- source count;
- consumer impact summary.

L1 focus:

- source detail;
- source change review;
- current active source list.

L2 management:

- Book asset editing;
- source linking;
- knowledge point management;
- profile-template management.

L3 execution:

- first-time setup;
- import flow;
- activation confirmation;
- service-account generation or world-pack side effects.

Do not mix L2 editing into L0 summary cards.

## 11. Data Direction

No required data model rewrite is implied by this design, but the UI should treat sources as distinct categories:

1. `system_fallback`
   - lives in system/user WorldBook state;
   - not a Book asset.
2. `book_asset`
   - lives in Book store;
   - can be linked by WorldBook.
3. `world_pack`
   - references world material and activation metadata;
   - does not own raw long text.

If implementation needs a source descriptor, prefer an explicit type field over inferring from IDs.

## 12. Non-Goals

This redesign does not include:

- standalone WorldBook Home app;
- Steam-like world store;
- token economy;
- DLC or paid unlock language;
- automatic retrieval over all Book text;
- forced migration of Settings fallback text into Book;
- automatic syncing between fallback text and copied Book assets;
- replacing World Hub or Cheats.

## 13. Acceptance Criteria

The redesign is ready for implementation planning when:

1. Book remains the user-owned text library.
2. WorldBook remains the activation/control panel under Settings.
3. First-time WorldBook use has a guided path.
4. A user can understand whether text is merely stored or currently active.
5. Built-in/Settings worldview text does not appear in Book by default.
6. Built-in/Settings worldview text can be copied to Book for user editing.
7. The copied Book asset is user-owned and does not auto-sync back to the fallback.
8. WorldBook shows current active sources and consumer impact before advanced editing controls.
9. Advanced World Pack, knowledge point, and role-template controls do not dominate the first-use path.
10. Book import/export uses a dialog, drawer, or explicit confirmation flow instead of permanent same-screen stacking.
11. Growing list surfaces, including Book and future App Store revisions, have a path to move item detail and execution controls out of the main list screen.

## 14. Planning Notes

The next implementation plan should start with IA and state visibility, not visual polish.

Recommended first implementation slice:

1. Add a WorldBook empty/onboarding state.
2. Add system fallback source presentation.
3. Add `Copy to Book` behavior for fallback text.
4. Reorder WorldBook so active sources and impact appear before advanced controls.
5. Improve Book detail to show whether an asset is active and where it is used.
6. Convert Book import/export into dialog or drawer confirmation flows.
7. Add tests for the distinction between fallback source and Book assets.
8. Record an App Store follow-up: avoid inline same-page growth if app entries and detail content expand.
