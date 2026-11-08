# Common Ground: persistent settlement experiment

New experiments use world version 2. Version 1 imports and browser saves retain their original physics and replay exactly; start a new experiment to use building. No migration rewrites an existing run.

The model chooses one action and optional speech. The private observation includes concrete legal action examples, local structures, dated remembered places, actual recent outcomes, and explicit rules about unrestricted access. Nobody is assigned a profession, team, leader, settlement goal, or exchange partner.

## Physical rules

- Gather timber at the finite renewing copse; carry up to eight timber and eight food, plus one jar.
- Contribute one timber per build action. Stores need two contributions; shelters need four. Projects persist and can be finished by another agent. Maximum three structures of distinct kinds on a tile.
- Completed stores hold up to 24 food, water and timber each. Deposit and withdraw transfer actual quantities. Water transport requires a jar. Eating and drinking directly at a store are allowed. All agents have access.
- Plant a garden using two carried food. Every third turn after planting it produces two food if tended in the last six turns, capped at 12. Harvest to inventory or eat there. Tending does not generate immediate food.
- Rest in a completed shelter with positive durability restores up to 26 energy and two health. Otherwise rest restores up to 18 energy. Neither restores nourishment. Completed shelters lose one durability every six turns; at zero their benefit stops. Repair spends one timber for four durability, capped at 12.
- Forgiving experiments spend one food and water every second turn. Scarce experiments spend both every turn. Energy upkeep is one per turn. Deprivation damage remains four for empty food and six for empty water per turn.
- Each agent starts with two carried food and the existing body reserves. No structure is created automatically. People do not block tiles, movement or sources. Speech claims do not establish enforceable ownership.

## Observation

The map shows structures and tiles repeatedly occupied. A place card exposes contribution and use history. Shared-place metrics count multiple contributors or use by someone who did not contribute; this is not a claim that cooperation or trust exists. Five-turn briefings cite actual construction, storage, production and use. Full histories remain in exported world state and deterministic journals.

## Deployment

Frontend and Node backend must both contain this change. `/health` advertises `contracts.sandbox: 2`; the browser checks it before advancing version 2 worlds. An old backend pauses explicitly without consuming a turn. Deploy GitHub main on Render if this message appears. Version 1 worlds continue using the original protocol and rules.

Automated tests verify mechanics and replay; they do not establish that any particular model will choose to build or cooperate.
