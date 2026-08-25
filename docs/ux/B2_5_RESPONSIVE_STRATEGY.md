# locaOS B2.5 Responsive Product Strategy

This document defines responsive behavior as a product requirement, not merely a CSS shrink-down.

## Product rule

- **Desktop optimizes for information density.**
- **Tablet optimizes for operational continuity.**
- **Mobile optimizes for task completion.**

The same underlying domain data may require different presentation strategies at different sizes.

## Desktop — command/workstation

Primary environment: agency desk, manager/owner workstation.

- Persistent sidebar/navigation.
- Multi-column dashboards where information density helps.
- Dense operational tables.
- Full filtering, sorting, selection and bulk-action workflows.
- Side-by-side detail panels where useful.
- Keyboard-first operation.
- Comfortable and Detailed density modes are useful here.

## Tablet — operational desk/field hybrid

Primary environment: reception/branch counter, supervisor moving around the agency, mixed desk/field use.

- Collapsible or compact navigation rather than a permanently dominant sidebar.
- One- or two-column layouts.
- Tables remain available when useful but must become horizontally manageable or transform to priority cards when width is insufficient.
- Filters can become an expandable panel/sheet.
- Detail views prefer full-width panels rather than forced side-by-side layouts.
- Larger touch targets than desktop.
- Comfortable density is the default.

## Mobile — task-first

Primary environment: field agent, vehicle return/pickup, inspection workflow.

- Compact navigation or accessible bottom navigation/drawer instead of a permanent desktop sidebar.
- One primary task per screen.
- Cards replace wide administrative tables where that is more usable.
- Sticky primary action where appropriate.
- Large touch targets.
- Inspection, return, damage and photo workflows should support one-handed use.
- Focus Mode should function as the effective field mobile home experience.
- Compact density means reduced information per item, **not tiny text**.
- Normal task completion must not depend on horizontal page scrolling.

## Information hierarchy example — Fleet

### Desktop

`Plate | Model | Category | Status | KM | Fuel | ...`

### Tablet

`Plate | Model | Status | KM | ...`

Secondary information may move behind a detail affordance.

### Mobile

```text
[Dacia Logan]
MA-12345
AVAILABLE
72,340 km
Fuel 68%

[View vehicle]
```

This is a presentation transformation, not a different domain model.

## Shared responsive acceptance criteria

- No permanent horizontal page overflow at supported widths.
- Interactive targets are comfortable for touch use.
- Keyboard focus remains visible and logical.
- Dialogs remain usable without viewport clipping.
- RTL layouts use logical alignment/spacing rather than left/right assumptions.
- Density modes remain information-hierarchy choices rather than micro-font scaling.
- Common field tasks are completable on a phone without requiring a desktop-style table.
- Tablet layouts preserve operational continuity without merely shrinking desktop UI.

## B2.5 implementation implication

Responsive behavior belongs primarily in shared foundations first:

1. responsive Shell/navigation;
2. global focus and interaction tokens;
3. DataTable mobile strategy;
4. FilterBar responsive presentation;
5. ConfirmAction responsive dialog;
6. shared PageHeader/EmptyState/loading/error behavior;
7. Fleet and Focus Mode application.

Only after these guarantees are established should broader B2.4 list-state features be implemented.
