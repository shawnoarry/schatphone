# Chat Social Runtime Trigger Design

Date: 2026-06-01

## Product Meaning

This slice lets the event runtime softly notice when a role could naturally open contact from the world simulation. In user terms: when the phone is awake and event automation is allowed, a suitable role can proactively appear as an incoming message request.

## V1 Boundary

1. V1 only creates low-risk role greeting proposals.
2. V1 does not let background logic directly edit Chat state.
3. V1 does not auto-create refusal, block, restore, or unblock changes.
4. High-risk role social changes still require World Hub review through the existing proposal queue.
5. The source must respect Surprise Mode, Chat module event toggle, tick-level cooldown/daily cap, and per-contact cooldown/daily cap.

## Candidate Rules

1. Candidate must be a role contact with a bound role profile.
2. Candidate must not be the user self profile.
3. Candidate must currently be a stranger or a previously declined request.
4. Connected contacts are intentionally excluded from this runtime source, because turning an existing connected chat back into a request would feel confusing.
5. The runtime picks a stable first candidate from the Chat list; richer scheduling can be added later.

## User-Facing Result

1. If allowed, the candidate becomes an audited incoming request.
2. The event log shows this as a Chat social runtime proposal.
3. If blocked by policy, cooldown, or daily cap, the proposal is recorded as blocked/skipped instead of silently changing Chat.
