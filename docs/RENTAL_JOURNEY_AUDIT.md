# locaOS Rental Journey Audit

## Purpose

A rental agency must be able to take one customer from first registration through reservation, handover, active rental, return, settlement and closure without dead ends, hidden manual work or contradictory state.

The audit is deliberately end-to-end. A feature is not considered working merely because an API endpoint exists or a button renders.

## Canonical journey

1. **Customer intake**
   - Find an existing customer or create a new one inline.
   - Capture the minimum information needed to reserve.
   - Add identity/licence documents later when available.

2. **Reservation**
   - Select category.
   - Select pickup/return branches.
   - Enter pickup/return timestamps.
   - Price rental and extras through the canonical quote engine.
   - Vehicle may remain unassigned.

3. **Vehicle assignment**
   - Show only suitable/available vehicles.
   - Validate availability, category compatibility and conflicts at assignment time.
   - Persist the assignment and make the next action obvious.

4. **Vehicle/legal readiness**
   - Required fleet legal documents valid.
   - Maintenance conflicts clear.
   - Vehicle operational state allows rental.

5. **Departure inspection**
   - Record mileage and fuel.
   - Checklist.
   - Existing/new damage.
   - Photos/evidence.
   - Customer acknowledgement.
   - Inspection becomes part of the contract snapshot.

6. **Contract**
   - Generate from reservation.
   - Contract pricing/dates must match the canonical reservation/quote data.
   - Draft → signature → immutable version history.
   - PDF must render the same serialized snapshot.

7. **Deposit/payment**
   - Record rental payment and deposit.
   - Foreign currency requires human-confirmed FX.
   - Payment/deposit history is append-only.

8. **Ready / handover**
   - Reservation may become READY only when required blockers are resolved.
   - Contract activation requires the handover prerequisites.
   - Activation moves contract, reservation and vehicle into the appropriate active states together.

9. **Active rental**
   - Track current rental.
   - Support extension/amendment with immutable versioning.
   - Price/time changes must recalculate consistently.

10. **Return**
    - Return inspection records mileage, fuel, checklist, photos and damage.
    - Damage/fuel differences are evidence first and human-confirmed before charging.

11. **Settlement**
    - Final payment/refund.
    - Deposit release or charge.
    - Any remaining balance is visible.

12. **Close**
    - Contract closes only after return/settlement prerequisites.
    - Reservation completes.
    - Vehicle returns to the correct fleet state.

## Audit invariants

- No UI message may instruct an agent to perform an action that the UI does not expose.
- No backend action may bypass a readiness prerequisite merely because it was called directly.
- Reservation, contract, vehicle, inspection and finance state must agree.
- Historical contract versions and financial entries are never edited in place.
- Seed/demo data is not required to operate the product.
- Every critical action has a visible success/failure result and a sensible next action.
- Refreshing the page must preserve the actual business state.
- Arabic/French/English must preserve the same workflow semantics.

## Automated audit

Run against the local demo API:

```powershell
node scripts/rental-journey-audit.mjs
```

The harness intentionally tests both positive and negative transitions. It creates a disposable demo customer and reservation and reports exactly where the journey stops.

## Current known gaps from code audit

- Reservation detail previously advertised vehicle assignment without exposing the action; the UI fix is now being carried forward.
- Contract activation was not yet enforcing the same readiness blockers shown by the reservation UI (departure inspection, deposit, etc.).
- Assignment needs explicit validation of vehicle availability/category in addition to database conflict protection.
- Core create flows need a complete UI audit so an agency can operate without relying on seeded demo records.

These are release blockers for pilot readiness, not cosmetic backlog items.
