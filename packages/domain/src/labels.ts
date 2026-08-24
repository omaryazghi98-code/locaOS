/** Status labels for UI (fr default / ar / en) — Morocco-first (§18). */
type Labels<T extends string> = Record<T, { fr: string; ar: string; en: string }>;

import type { VehicleStatus, FleetStatus } from './vehicleStateMachine.js';
import type { ReservationStatus } from './reservation.js';

export const VEHICLE_STATUS_LABELS: Labels<VehicleStatus> = {
  AVAILABLE: { fr: 'Disponible', ar: 'متاح', en: 'Available' },
  RESERVED: { fr: 'Réservé', ar: 'محجوز', en: 'Reserved' },
  PREPARING: { fr: 'En préparation', ar: 'قيد التحضير', en: 'Preparing' },
  CONTRACT_READY: { fr: 'Prêt au contrat', ar: 'جاهز للعقد', en: 'Contract ready' },
  IN_TRANSIT: { fr: 'En livraison', ar: 'في الطريق', en: 'In transit' },
  RENTED: { fr: 'Loué', ar: 'مؤجر', en: 'Rented' },
  OVERDUE: { fr: 'Retard', ar: 'متأخر', en: 'Overdue' },
  AWAITING_INSPECTION: { fr: 'Attente inspection', ar: 'بانتظار الفحص', en: 'Awaiting inspection' },
  INSPECTED: { fr: 'Inspecté', ar: 'مفحوص', en: 'Inspected' },
  CLEANING: { fr: 'Nettoyage', ar: 'تنظيف', en: 'Cleaning' },
  MAINTENANCE: { fr: 'Maintenance', ar: 'صيانة', en: 'Maintenance' },
  IMMOBILIZED: { fr: 'Immobilisé', ar: 'معطل', en: 'Immobilized' },
  ACCIDENT: { fr: 'Accident', ar: 'حادث', en: 'Accident' },
  UNAVAILABLE: { fr: 'Indisponible', ar: 'غير متاح', en: 'Unavailable' },
};

export const FLEET_STATUS_LABELS: Labels<FleetStatus> = {
  IN_FLEET: { fr: 'En flotte', ar: 'في الأسطول', en: 'In fleet' },
  FOR_SALE: { fr: 'À vendre', ar: 'للبيع', en: 'For sale' },
  SOLD: { fr: 'Vendu', ar: 'مبيع', en: 'Sold' },
  RETIRED: { fr: 'Retiré', ar: 'مستبعد', en: 'Retired' },
};

export const RESERVATION_STATUS_LABELS: Labels<ReservationStatus> = {
  DRAFT: { fr: 'Brouillon', ar: 'مسودة', en: 'Draft' },
  CONFIRMED: { fr: 'Confirmée', ar: 'مؤكدة', en: 'Confirmed' },
  VEHICLE_ASSIGNED: { fr: 'Véhicule affecté', ar: 'سيارة معينة', en: 'Vehicle assigned' },
  READY: { fr: 'Prête', ar: 'جاهزة', en: 'Ready' },
  IN_PROGRESS: { fr: 'En cours', ar: 'جارية', en: 'In progress' },
  COMPLETED: { fr: 'Terminée', ar: 'مكتملة', en: 'Completed' },
  CANCELLED: { fr: 'Annulée', ar: 'ملغاة', en: 'Cancelled' },
  NO_SHOW: { fr: 'No-show', ar: 'لم يحضر', en: 'No-show' },
};

export const TZ = 'Africa/Casablanca';
export function formatDateTime(d: Date | string, locale = 'fr-MA'): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat(locale, {
    timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}
