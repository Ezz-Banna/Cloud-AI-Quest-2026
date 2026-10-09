# Human review and governance

Status: **implemented as a minimal demo workflow**. The software path (request, review against a rubric, decision, contest, deletion) works and is covered by automated tests. What is simulated is the reviewer organisation: in this prototype the reviewers are Bridgecom team members signed in as admin. There is no external assessor network, no reviewer training programme and no partner institution. The interface says so wherever a review is offered.

## What a review is, and is not

A review answers one narrow question: *does the submitted work show this skill at the level the person recorded, according to a fixed rubric?* It is not a certificate, an endorsement, an employment recommendation or a check of identity. "Reviewed against a stated rubric" means only that a named reviewer looked at the submitted links and recorded a decision and a reason.

## Evidence states

| State | Meaning | How a skill gets there |
|---|---|---|
| Self-reported | The person described the skill. Nothing attached. | Describing an achievement, or adding a skill by hand |
| Evidence attached | A link to work is attached. Nobody has looked at it. | Adding an http(s) link |
| Awaiting review | The person asked for a review of that skill's work. | "Ask for a review" |
| Reviewed against a stated rubric | Every rubric line was met and a reason was recorded. | Reviewer decision |
| Needs clarification | At least one rubric line was not met; the reviewer's reason says what is missing. | Reviewer decision |

A finished course never changes a skill's state.

## Who reviews

- Demo: a Bridgecom team member signed in to `/admin` with the shared admin password. The decision records the name they type, shown as "Name (Bridgecom team, demo)".
- Planned (not built): individual reviewer accounts with roles, conflict-of-interest declaration, and reviewers drawn from partner training providers or employers. No such partners exist today.

## What reviewers can see and change

- They see: the skill id, the level the person recorded, and the links and short quotes the person chose to send for that one skill. They do not see the person's name, grades, city, school, budget, other skills or support needs.
- They can change: only the decision on that request (four rubric lines, a reason of 10 to 600 characters, their name). They cannot edit the person's profile, links or levels. The profile lives on the person's device.

## Rubric (fixed, shown to both sides)

1. The link opens and the work can be seen without signing in.
2. The person's own part of the work can be identified.
3. The work uses this skill in a meaningful way.
4. The work matches the level the person recorded.

All four met gives "Reviewed against a stated rubric". Anything else gives "Needs clarification" with the reason.

## Records

Stored on the server (`data/runtime/store.json`) per request: random id, a SHA-256 hash of the requester's token, skill id, level, the submitted links and quotes, request time, and once decided: decision, rubric answers, reason, reviewer name, decision time. The plain token is stored only on the requester's device.

Retention: a request is deleted 30 days after a decision, or 60 days after it was made if never decided (`src/lib/reviews.ts`). On the free hosting plan the disk is also reset on each restart, which deletes everything sooner; that is a known limitation, not a feature.

## How a person contests a decision

1. Read the reason and the rubric answers (Empower, under the skill).
2. Add more work or fix the link, then ask for a review again. A new request is created; where the team allows, a different member reviews it.
3. Withdraw at any time: "Withdraw" deletes the request and the copied links from the server.

There is no formal appeals body in the prototype.

## Access

| Action | Who | Mechanism |
|---|---|---|
| Create a request | Anyone | `POST /api/reviews` (rate-limited, http(s) links only, max 5 items) |
| Read or withdraw a request | The requester only | Bearer token returned at creation; an id alone returns 404 |
| List and decide | Signed-in admin | Server-side session cookie, revocable on logout |

Related: sharing with employers follows the same pattern. It is off by default, is made per role, needs explicit consent, returns a private token that withdraws the share, and an employer sees shares only with that role's manage token (returned once when the role is created) or as a signed-in admin. Employers see counts and evidence states, never a score or ranking.
