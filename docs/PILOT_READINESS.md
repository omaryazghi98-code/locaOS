# locaOS — Pilot Readiness Checklist

This document defines when locaOS is ready to be placed in the hands of real Moroccan rental agencies for the free experimental pilot.

## Pilot philosophy

The first pilot is intentionally **0 cost / 0 profit**. The objective is product learning, reliability, measurable operational value and long-term agency relationships.

Target: 5–10 carefully selected agencies with different operating patterns (small fleet, airport-heavy, mixed foreign customers, multi-branch, high-season workload, etc.).

## Before inviting agencies

### Product correctness

- [ ] Reservation, vehicle, contract, inspection and finance data remain consistent.
- [ ] Contract PDFs match the current contract version exactly.
- [ ] Amendments create new immutable versions.
- [ ] Rental days use the shared time engine.
- [ ] Quote totals cannot contradict reservation period.
- [ ] Payments remain append-only/auditable.
- [ ] Deposits/refunds/reversals reconcile correctly.
- [ ] Foreign-currency payments have explicit rate confirmation.
- [ ] Fleet legal obligations can be tracked and surfaced.

### Agency workflows

- [ ] New agency can be configured without developer-only database edits.
- [ ] Owner can create users/roles.
- [ ] Fleet can be entered/imported.
- [ ] Customers can be created quickly.
- [ ] Reservation can be created in under a few minutes.
- [ ] Contract can be generated from a reservation without re-entering known data.
- [ ] Inspection can be completed from a phone/tablet.
- [ ] Payment/deposit can be recorded.
- [ ] Return can be completed.
- [ ] Documents/obligations can be renewed and audited.
- [ ] Reports/exports can be produced without developer assistance.

### UX

- [ ] FR complete on critical screens.
- [ ] AR/RTL complete on critical screens, including reload/deep links.
- [ ] EN complete on critical screens.
- [ ] Desktop workflow verified.
- [ ] Tablet workflow verified.
- [ ] Phone/field workflow verified.
- [ ] Keyboard focus works on core actions.
- [ ] Dialogs are accessible and do not trap users incorrectly.
- [ ] Errors have actionable messages.
- [ ] No critical buttons silently do nothing.

### Data portability

- [ ] Customer export works.
- [ ] Reservation export works.
- [ ] Vehicle/fleet export works.
- [ ] Contracts export works.
- [ ] Payments/invoices export works.
- [ ] Agency can retrieve its own data.
- [ ] Backup/restore procedure is documented.

## Pilot onboarding package

Each agency receives:

1. Short onboarding session.
2. Admin account + role setup.
3. Fleet/customer import or guided entry.
4. Contract template/configuration check.
5. One real reservation walkthrough.
6. One real return/inspection walkthrough.
7. Feedback channel.
8. Weekly check-in during the first month.

## Pilot measurement

Track measurable outcomes rather than vanity metrics:

- Time to create reservation
- Time to prepare contract
- Time to complete return
- Number of manual spreadsheets avoided
- Number of data-entry repetitions avoided
- Missed/late compliance obligations caught
- Payment/reconciliation corrections
- Contract inconsistencies found
- Daily active users by role
- Reservations completed in locaOS
- Percentage of agency workflow handled in locaOS
- Support requests per agency
- Feature requests by frequency
- Retention after 30/60/90 days

## Pilot feedback contract

The agency should understand that the pilot is experimental and can change quickly.

The preferred exchange is:

**locaOS provides:**

- free use during pilot
- onboarding
- support
- regular fixes
- early features

**Pilot agency provides:**

- honest workflow feedback
- examples of missing processes
- bug reports
- permission to discuss anonymized results where agreed
- a realistic willingness to test the product with actual staff

## Exit criteria — move from pilot to founding agency

A pilot agency is a candidate for a founding-agency relationship when:

- staff use locaOS without constant supervision;
- core rentals are processed end-to-end;
- the agency reports measurable time/error reduction;
- no critical security/data-integrity issue is open;
- the agency asks to keep using locaOS;
- required support load is predictable;
- the product has a repeatable onboarding process.

## Founding agency offer

Possible structure, to be finalized after pilot evidence:

- permanent preferential subscription price;
- early access to major features;
- priority support;
- direct feedback relationship;
- optional public case study / logo with written permission.

Do not promise lifetime pricing or fixed discounts until unit economics and support costs are understood.

## Public SaaS gate

Before charging general customers:

- stable pricing model;
- agency onboarding is repeatable;
- exports/portability work;
- billing/subscriptions are implemented;
- feature entitlements exist;
- support process exists;
- production storage/backup is ready;
- monitoring/incident handling is documented;
- terms/privacy/legal review completed;
- security review completed.
