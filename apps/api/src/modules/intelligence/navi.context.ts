import { and, eq, inArray } from 'drizzle-orm';
import { contracts, customers, inspections, reservations, vehicles } from '../../db/schema.js';
import { withTenant } from '../../db/client.js';
import type { NaviContext, NaviEvidence, NaviEntityType } from './navi.types.js';

const refPattern = /\b(RES-[A-Z0-9-]+)\b/i;
const uuidPattern = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;

export function resolveNaviEntity(query: string): { type: NaviEntityType; reference?: string } | null {
  const reservation = query.match(refPattern)?.[1];
  if (reservation) return { type: 'reservation', reference: reservation.toUpperCase() };
  const id = query.match(uuidPattern)?.[0];
  if (id) return { type: 'reservation', id };
  return null;
}

export async function buildNaviContext(agencyId: string, query: string): Promise<NaviContext> {
  const resolved = resolveNaviEntity(query);
  if (!resolved) {
    return { query, entity: null, facts: {}, evidence: [], relatedEntities: [], missingContext: ['No supported reservation reference or entity identifier was found.'] };
  }

  return withTenant(agencyId, async (tx) => {
    const reservationRows = resolved.reference
      ? await tx.select().from(reservations).where(and(eq(reservations.agencyId, agencyId), eq(reservations.reference, resolved.reference))).limit(1)
      : await tx.select().from(reservations).where(and(eq(reservations.agencyId, agencyId), eq(reservations.id, resolved.id!))).limit(1);
    const reservation = reservationRows[0];
    if (!reservation) {
      return { query, entity: { type: 'reservation', id: resolved.id ?? '', reference: resolved.reference }, facts: {}, evidence: [], relatedEntities: [], missingContext: ['Reservation was not found in this agency.'] };
    }

    const evidence: NaviEvidence[] = [{
      source: 'locaOS.reservations', entityType: 'reservation', entityId: reservation.id,
      label: `Réservation ${reservation.reference}`,
      facts: { reference: reservation.reference, status: reservation.status, pickupAt: reservation.pickupAt, returnAt: reservation.returnAt, vehicleId: reservation.vehicleId, customerId: reservation.customerId },
    }];

    const relatedEntities: NaviContext['relatedEntities'] = [{ type: 'reservation', id: reservation.id, reference: reservation.reference }];
    const facts: Record<string, unknown> = { reservation: { reference: reservation.reference, status: reservation.status, pickupAt: reservation.pickupAt, returnAt: reservation.returnAt, vehicleId: reservation.vehicleId } };
    const missingContext: string[] = [];

    const customerRows = await tx.select().from(customers).where(and(eq(customers.agencyId, agencyId), eq(customers.id, reservation.customerId))).limit(1);
    if (customerRows[0]) {
      const c = customerRows[0];
      facts.customer = { id: c.id, firstName: c.firstName, lastName: c.lastName };
      relatedEntities.push({ type: 'customer', id: c.id });
      evidence.push({ source: 'locaOS.customers', entityType: 'customer', entityId: c.id, label: 'Client lié à la réservation', facts: facts.customer as Record<string, unknown> });
    } else missingContext.push('Customer record was not found.');

    if (reservation.vehicleId) {
      const vehicleRows = await tx.select().from(vehicles).where(and(eq(vehicles.agencyId, agencyId), eq(vehicles.id, reservation.vehicleId))).limit(1);
      if (vehicleRows[0]) {
        const v = vehicleRows[0];
        facts.vehicle = { id: v.id, plate: v.plate, operationalStatus: v.operationalStatus, currentBranchId: v.currentBranchId };
        relatedEntities.push({ type: 'vehicle', id: v.id });
        evidence.push({ source: 'locaOS.vehicles', entityType: 'vehicle', entityId: v.id, label: `Véhicule ${v.plate}`, facts: facts.vehicle as Record<string, unknown> });
      } else missingContext.push('Assigned vehicle record was not found.');
    } else {
      facts.vehicle = null;
      missingContext.push('No vehicle is assigned to this reservation.');
    }

    const contractRows = await tx.select().from(contracts).where(and(eq(contracts.agencyId, agencyId), eq(contracts.reservationId, reservation.id), inArray(contracts.status, ['DRAFT', 'SIGNED', 'ACTIVE', 'AMENDED', 'CLOSED']))).limit(1);
    if (contractRows[0]) {
      const c = contractRows[0];
      facts.contract = { id: c.id, status: c.status, vehicleId: c.vehicleId };
      relatedEntities.push({ type: 'contract', id: c.id });
      evidence.push({ source: 'locaOS.contracts', entityType: 'contract', entityId: c.id, label: 'Contrat lié à la réservation', facts: facts.contract as Record<string, unknown> });
    } else {
      facts.contract = null;
      missingContext.push('No active contract record was found.');
    }

    if (facts.contract && typeof facts.contract === 'object' && 'id' in facts.contract) {
      const inspectionRows = await tx.select().from(inspections).where(and(eq(inspections.agencyId, agencyId), eq(inspections.contractId, (facts.contract as { id: string }).id))).limit(10);
      facts.inspections = inspectionRows.map((i) => ({ id: i.id, kind: i.kind, status: i.status, createdAt: i.createdAt }));
      for (const i of inspectionRows) {
        relatedEntities.push({ type: 'inspection', id: i.id });
        evidence.push({ source: 'locaOS.inspections', entityType: 'inspection', entityId: i.id, label: `${i.kind} inspection`, facts: { status: i.status, createdAt: i.createdAt } });
      }
    }

    return { query, entity: { type: 'reservation', id: reservation.id, reference: reservation.reference }, facts, evidence, relatedEntities, missingContext };
  });
}
