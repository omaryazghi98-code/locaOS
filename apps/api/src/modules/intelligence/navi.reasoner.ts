import type { NaviContext, NaviReasoningResult } from './navi.types.js';

/**
 * Deterministic v0.1 reasoner.
 *
 * This is intentionally provider-free: it proves the NAVI context contract before
 * spending model credits. A model adapter can implement the same output contract later.
 */
export function reasonOverContext(context: NaviContext): NaviReasoningResult {
  if (!context.entity) {
    return {
      answer: 'Je ne peux pas identifier une réservation ou une entité supportée dans cette demande.',
      facts: [], inferences: [], impact: null, recommendation: null,
      evidence: [], relatedEntities: [], proposedActions: [], confidence: 'LOW',
    };
  }

  const reservation = context.facts.reservation as { reference: string; status: string; vehicleId: string | null };
  const vehicle = context.facts.vehicle as { plate: string; operationalStatus: string } | null;
  const facts: string[] = [
    `La réservation ${reservation.reference} est actuellement ${reservation.status}.`,
    reservation.vehicleId ? `Un véhicule est affecté à cette réservation.` : 'Aucun véhicule n’est affecté à cette réservation.',
  ];
  const inferences: string[] = [];
  let impact: string | null = null;
  let recommendation: string | null = null;
  const proposedActions: NaviReasoningResult['proposedActions'] = [];

  if (!reservation.vehicleId) {
    inferences.push('La réservation ne peut pas être considérée comme prête pour le départ tant qu’un véhicule éligible n’est pas affecté.');
    impact = 'Le départ peut être bloqué si aucun véhicule éligible n’est affecté à temps.';
    recommendation = 'Examiner les véhicules disponibles dans la catégorie demandée et affecter un véhicule éligible.';
    proposedActions.push({ type: 'ASSIGN_VEHICLE', label: 'Affecter un véhicule', entityType: 'reservation', entityId: context.entity.id });
  } else if (vehicle) {
    facts.push(`Le véhicule affecté est ${vehicle.plate}, avec le statut opérationnel ${vehicle.operationalStatus}.`);
  }

  const answer = !reservation.vehicleId
    ? `${reservation.reference} demande attention parce qu’aucun véhicule n’est actuellement affecté.`
    : `${reservation.reference} ne présente pas, dans le contexte récupéré, de blocage lié à une affectation de véhicule.`;

  return {
    answer, facts, inferences, impact, recommendation,
    evidence: context.evidence, relatedEntities: context.relatedEntities,
    proposedActions, confidence: context.missingContext.length > 0 ? 'MEDIUM' : 'HIGH',
  };
}
