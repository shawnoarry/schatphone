# SchatPhone ElevenLabs Audio Skills Cross-PC Setup

Updated: 2026-08-10

Purpose: let another SchatPhone development PC reproduce, verify, use, and hand off the
project's optional ElevenLabs audio-generation skills without turning them into product runtime
dependencies or exposing credentials.

This guide owns cross-PC setup for these three project-local skills only:

| Skill            | Intended development use                                                      | Current product status                                                          |
| ---------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `text-to-speech` | prototype role speech, narration, and accessibility audio                     | optional development capability; Chat voice cards remain virtual                |
| `music`          | prototype original songs, background music, composition plans, and inpainting | optional development capability; Music generation is not a runtime provider     |
| `sound-effects`  | prototype notification, UI, environment, journey, and Mini Scene sounds       | optional development capability; no runtime sound-effects service is integrated |

The upstream source is `elevenlabs/skills`. The vendored copies and their provenance hashes are
committed through `.agents/skills` and `skills-lock.json`.

## 1. Authority And Boundaries

Read these before changing product behavior:

1. root `AGENTS.md`;
2. `docs/process/AI_WORK_MODE.md`;
3. `docs/roadmap/TODO_ROADMAP.md`;
4. the matching package handoff;
5. `docs/architecture/MUSIC_MODULE_CONTRACT.md` when Music ownership, playback, credentials,
   persistence, backup, or Chat/Map projections may change.

Installing a Skill changes the agent's development instructions. It does not:

- add an ElevenLabs SDK to `package.json`;
- configure an API Key inside SchatPhone;
- add a user-facing audio-generation route;
- approve Chat, Phone, Music, Map, or Mini Scene runtime integration;
- make generated output durable or licensed for product use.

Keep the current project boundaries:

- provider credentials remain machine-local and never enter Git, prompts, screenshots, logs, or
  backup fixtures;
- generated media remains a temporary candidate until a user explicitly keeps it;
- the accepting module owns the retained record and its meaning;
- Chat and Map must not receive Music credentials, raw provider responses, queue contents, or
  stream URLs;
- playback and generation that consume network or credits require an explicit user action;
- do not imitate a living artist, reproduce copyrighted lyrics, or synthesize an identifiable
  person's voice without the required rights and consent.

## 2. Normal Cross-PC Setup

The normal path is Git synchronization. Do not independently refresh the upstream Skill on every
machine.

From the confirmed SchatPhone project root:

```powershell
git pull
npm.cmd install
```

Verify the vendored files:

```powershell
Test-Path .\.agents\skills\text-to-speech\SKILL.md
Test-Path .\.agents\skills\music\SKILL.md
Test-Path .\.agents\skills\sound-effects\SKILL.md
Select-String -Path .\skills-lock.json -Pattern '"text-to-speech"|"music"|"sound-effects"'
npx.cmd -y skills list --json
```

All three `Test-Path` commands should return `True`. The skill list should report all three with
`scope` set to `project`.

Restart Codex or the current agent host after the first pull. Project-local Skills are loaded at
task startup and may not appear in a session that was already open.

## 3. Restore Missing Skill Files

When `.agents/skills` is missing or incomplete but `skills-lock.json` is present, restore the full
project-local inventory from the lock:

```powershell
npx.cmd -y skills experimental_install
```

For a deliberate clean installation of only the audio set from the reviewed upstream repository:

```powershell
npx.cmd -y skills add elevenlabs/skills --skill text-to-speech music sound-effects --copy
```

Run either command from the project root. Then repeat the verification commands in section 2 and
run:

```powershell
npm.cmd run governance:check
```

Do not use `--skill '*'` for ordinary recovery. The upstream repository contains additional
speech, dubbing, agent, voice-conversion, and key-setup Skills that are outside this approved set.
The vendored installation references may mention the upstream `setup-api-key` Skill; it is
intentionally not installed. Use section 4 of this guide instead.

## 4. API Key Setup

The Skills require internet access and `ELEVENLABS_API_KEY` when they make live requests. Music
generation also requires an eligible paid ElevenLabs plan.

Create a dedicated API Key at:

```text
https://elevenlabs.io/app/settings/api-keys
```

Prefer a separate key per development machine and apply endpoint or spending restrictions when
the provider account supports them. Transfer a key between machines only through an approved
secret channel.

For one PowerShell session, read the key without echoing it and expose it only to child processes:

```powershell
$secureAudioKey = Read-Host 'ElevenLabs API Key' -AsSecureString
$audioKeyPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureAudioKey)
try {
  $env:ELEVENLABS_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($audioKeyPtr)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($audioKeyPtr)
  Remove-Variable secureAudioKey, audioKeyPtr
}
```

Verify presence without printing the secret:

```powershell
if ([string]::IsNullOrWhiteSpace($env:ELEVENLABS_API_KEY)) {
  'ELEVENLABS_API_KEY is not configured'
} else {
  'ELEVENLABS_API_KEY is configured for this process'
}
```

Closing that PowerShell session clears the process-local value. For persistent use, use the
machine's approved secret manager or agent-host secret facility. This project does not standardize
or commit a persistent secret store.

Never put the real key in:

- `.env.example`, source code, Markdown, JSON fixtures, or `skills-lock.json`;
- Chat or issue text;
- screenshots, test artifacts, logs, or generated request records;
- SchatPhone public provider profiles or ordinary backup data.

## 5. Zero-Credit Verification

Installation verification does not require an API request:

```powershell
npx.cmd -y skills list --json
npm.cmd run governance:check
git diff --check
```

Open a fresh Codex task and ask:

```text
List the project-local ElevenLabs audio Skills available for this task. Do not call an API.
```

The expected answer includes `text-to-speech`, `music`, and `sound-effects`. A Skill being visible
does not prove that the API Key, billing plan, network, or generation endpoint works.

## 6. First Live Smoke Test

Live smoke tests consume quota or credits. Run only after the user approves the cost and output
location.

Keep exploratory output outside the repository, for example:

```powershell
$audioPreviewRoot = Join-Path $env:USERPROFILE '.codex\generated_audio\schatphone'
New-Item -ItemType Directory -Force -Path $audioPreviewRoot | Out-Null
```

Use one small request at a time:

```text
Use the text-to-speech Skill to synthesize one short Chinese sentence with a standard library
voice. Save it under the approved preview directory. Do not edit SchatPhone code or dependencies.
```

```text
Use the sound-effects Skill to create a one-second restrained phone notification sound. Save it
as a preview only. Report the model, output path, and request result without exposing credentials.
```

```text
Use the music Skill to create the shortest supported instrumental sketch for a calm night journey.
Confirm expected credit use before calling the API and keep the result outside the repository.
```

Verify every output by listening to the complete file and checking format, duration, clipping,
unexpected speech, and prompt compliance. Do not promote a preview into `public/` or another
runtime path during the smoke test.

## 7. Project Use Order

Use the lowest-risk path that proves value:

1. generate temporary previews outside the repo;
2. listen and compare before retaining anything;
3. record rights, consent, provider, model, prompt, cost, and output identity;
4. discard rejected candidates;
5. promote an accepted static asset only in a separately scoped product/content task;
6. design a provider Adapter and persistence contract only after repeated value is proven.

Recommended first uses:

- `sound-effects`: reviewed static notification, UI, journey, or world ambience candidates;
- `text-to-speech`: role-voice and narration prototypes that do not alter current Chat records;
- `music`: original world or journey music prototypes, with ElevenLabs as a candidate source rather
  than a new Music runtime provider.

Deferred until separately approved:

- replacing Chat's current virtual voice cards with audio binaries or URLs;
- microphone capture, speech-to-speech, voice isolation, cloning, or dubbing;
- automatic generation from Chat, Phone, Map, Calendar, Event Runtime, or Mini Scene;
- adding `@elevenlabs/elevenlabs-js` or another SDK to SchatPhone dependencies;
- persisting provider-generated URLs, request payloads, or diagnostics in another module;
- background or closed-app generation and playback claims.

## 8. Handoff Record

For any generation round that another machine may continue, leave a compact record next to the
accepted task artifact or in the owning task handoff:

```text
Purpose:
Skill: text-to-speech | music | sound-effects
Provider/model:
Input prompt or authorized source:
Output path and format:
Candidate status: preview | accepted | discarded
Owning module if accepted:
Rights/consent evidence:
Cost or quota note:
Request ID or redacted diagnostic ID:
Validation performed:
Remaining issue and next safe action:
```

Never record the API Key, authorization header, full secret-bearing request, or a private voice
sample in this handoff.

## 9. Updating The Skills

One machine should own an upstream refresh. Other machines should receive the reviewed result
through Git.

Before updating:

1. inspect the upstream repository and changelog;
2. confirm the requested Skill set is still exactly three;
3. check whether tools, permissions, models, credential handling, or output behavior changed.

Update only the approved project-local Skills:

```powershell
npx.cmd -y skills update text-to-speech music sound-effects --project
```

Then inspect and validate:

```powershell
git status --short
git diff -- .agents/skills skills-lock.json docs/process/ELEVENLABS_AUDIO_SKILLS_CROSS_PC_SETUP.md
git diff --check
npm.cmd run governance:check
```

Do not accept an update that silently installs additional ElevenLabs Skills. Do not combine a Skill
refresh with a product dependency update or runtime audio feature.

## 10. Troubleshooting

| Symptom                                        | Check                                                                                                   |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Skill files exist but Codex does not list them | restart Codex or open a new task                                                                        |
| PowerShell blocks `npx.ps1`                    | use `npx.cmd`                                                                                           |
| `401`                                          | confirm the current process has the correct API Key without printing it                                 |
| `422`                                          | check model, voice ID, duration, output format, and plan eligibility                                    |
| `429`                                          | stop retrying, inspect quota/rate limits, and wait or change the approved plan                          |
| Music request is rejected                      | confirm the account has an eligible paid plan and the prompt avoids artist imitation/copyrighted lyrics |
| Skill suggests adding an SDK                   | do not change SchatPhone dependencies without a separate approved implementation slice                  |
| Generated file exists but is not in the app    | expected: a development preview is not a retained SchatPhone record                                     |
| Another PC has a different hash                | stop and compare Git revision plus `skills-lock.json`; do not overwrite the reviewed copy blindly       |

## 11. Current Verified State

Verified on 2026-08-10 on the current Windows development PC:

- the three Skills are project-local under `.agents/skills`;
- `skills-lock.json` records their `elevenlabs/skills` provenance and content hashes;
- no ElevenLabs SDK was added to `package.json` or `package-lock.json`;
- no API Key was written to the repository;
- no live paid generation request was run during installation;
- this tooling addition changes no roadmap priority or product runtime status.
