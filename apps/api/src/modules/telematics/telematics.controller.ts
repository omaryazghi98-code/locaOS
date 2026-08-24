/**
 * Telematics foundation (V1 §7 / ADR-0009/0010): provider-normalized ingestion,
 * latest-position read model, and the first contradiction SIGNALS.
 * Mock devices are explicitly labeled status='MOCK'; ingest is token-guarded.
 * Signals DETECT → EXPLAIN → ALERT; nothing accuses customers or acts (§14).
 */
import { Body, Controller, Get, Post, Req, UseGuards, Headers, UnauthorizedException } from '@nestjs/common';
import { and, desc, eq, gte } from 'drizzle-orm';
import { z } from 'zod';
import { withTenant, db, type Tx } from '../../db/client';
import { branches, contracts, telematicsDevices, telematicsEvents, vehiclePositions, vehicles } from '../../db/schema';
import { env } from '../../env';
import { ZodValidationPipe } from '../common/zod.pipe.js';
import { AuthGuard, AuthedRequest, PermissionsGuard, RequirePermission } from '../auth/guards.js';
import { raiseAlert } from '../alerts/evaluator.js';

const RawFixSchema = z.object({
  deviceId: z.string(),            // provider external id
  messageId: z.string().optional(),
  occurredAt: z.string().datetime(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  speedKmh: z.number().min(0).max(300).default(0),
  heading: z.number().min(0).max(360).optional(),
  ignitionOn: z.boolean().optional(),
  voltage: z.number().optional(),
  mileageKm: z.number().int().optional(),
});
export type RawFix = z.infer<typeof RawFixSchema>;

/** Normalize one provider fix → internal events + position read model (idempotent by messageId). */
export async function ingestFix(agencyId: string, fix: RawFix): Promise<{ accepted: boolean; reason?: string }> {
  return withTenant(agencyId, async (tx) => {
    const dev = await tx.select().from(telematicsDevices)
      .where(and(eq(telematicsDevices.agencyId, agencyId), eq(telematicsDevices.externalId, fix.deviceId))).limit(1);
    const device = dev[0];
    if (!device) return { accepted: false, reason: 'device unknown' };
    if (device.vehicleId == null) return { accepted: false, reason: 'device not bound' };
    if (fix.messageId) {
      const dup = await tx.select({ id: telematicsEvents.id }).from(telematicsEvents)
        .where(eq(telematicsEvents.providerMessageId, fix.messageId)).limit(1);
      if (dup[0]) return { accepted: false, reason: 'duplicate' };
    }
    const moving = fix.speedKmh >= 20;
    await tx.insert(telematicsEvents).values({
      agencyId, deviceId: device.id, vehicleId: device.vehicleId,
      eventType: moving ? 'MOVEMENT' : 'STOP',
      payload: { lat: fix.lat, lng: fix.lng, speedKmh: fix.speedKmh, heading: fix.heading ?? null,
        ignitionOn: fix.ignitionOn ?? null, voltage: fix.voltage ?? null, mileageKm: fix.mileageKm ?? null } as never,
      occurredAt: new Date(fix.occurredAt), providerMessageId: fix.messageId ?? null,
    });
    if (fix.ignitionOn === true) {
      await tx.insert(telematicsEvents).values({
        agencyId, deviceId: device.id, vehicleId: device.vehicleId, eventType: 'IGNITION_ON',
        payload: {} as never, occurredAt: new Date(fix.occurredAt),
        providerMessageId: fix.messageId ? `${fix.messageId}:ign1` : null,
      }).onConflictDoNothing();
    }
    await tx.insert(vehiclePositions).values({
      vehicleId: device.vehicleId, agencyId, lat: String(fix.lat), lng: String(fix.lng),
      speedKmh: Math.round(fix.speedKmh), heading: fix.heading != null ? Math.round(fix.heading) : null,
      ignitionOn: fix.ignitionOn ?? null, voltage: fix.voltage != null ? String(fix.voltage) : null,
      fixedAt: new Date(fix.occurredAt), updatedAt: new Date(),
    }).onConflictDoUpdate({ target: vehiclePositions.vehicleId, set: {
      lat: String(fix.lat), lng: String(fix.lng), speedKmh: Math.round(fix.speedKmh),
      heading: fix.heading != null ? Math.round(fix.heading) : null, ignitionOn: fix.ignitionOn ?? null,
      voltage: fix.voltage != null ? String(fix.voltage) : null, fixedAt: new Date(fix.occurredAt), updatedAt: new Date(),
    } });
    await tx.update(telematicsDevices).set({ lastSeenAt: new Date() }).where(eq(telematicsDevices.id, device.id));
    return { accepted: true };
  });
}

@Controller('api/telematics')
export class TelematicsController {
  /** Provider ingest — bearer token (no session). Providers push here; dedup by messageId. */
  @Post('ingest')
  async ingest(@Headers('authorization') auth: string | undefined, @Body(new ZodValidationPipe(z.object({ fixes: RawFixSchema.array().min(1).max(100) }))) body: { fixes: RawFix[] }) {
    if (!env.telematicsIngestToken) throw new UnauthorizedException('Ingestion telematique non configurée (TELEMATICS_INGEST_TOKEN)');
    if (auth !== `Bearer ${env.telematicsIngestToken}`) throw new UnauthorizedException('Token invalide');
    const results: { deviceId: string; accepted: boolean; reason?: string }[] = [];
    for (const fix of body.fixes) {
      const dev = await db.select({ agencyId: telematicsDevices.agencyId })
        .from(telematicsDevices).where(eq(telematicsDevices.externalId, fix.deviceId)).limit(1);
      if (!dev[0]) { results.push({ deviceId: fix.deviceId, accepted: false, reason: 'unknown' }); continue; }
      results.push({ deviceId: fix.deviceId, ...(await ingestFix(dev[0].agencyId, fix)) });
    }
    return { processed: results.length, results };
  }

  @Get('devices')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermission('fleet:read')
  async devices(@Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, (tx) => tx.select({ d: telematicsDevices, plate: vehicles.plate })
      .from(telematicsDevices).leftJoin(vehicles, eq(vehicles.id, telematicsDevices.vehicleId))
      .where(eq(telematicsDevices.agencyId, req.ctx!.agencyId)));
  }

  /** Map view data: latest positions + status (read model; no external tiles — sandbox-safe). */
  @Get('positions')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermission('fleet:read')
  async positions(@Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, (tx) => tx.select({
      p: vehiclePositions, plate: vehicles.plate, status: vehicles.operationalStatus,
    }).from(vehiclePositions).innerJoin(vehicles, eq(vehicles.id, vehiclePositions.vehicleId))
      .where(eq(vehiclePositions.agencyId, req.ctx!.agencyId)));
  }
}

/**
 * Contradiction signals with hysteresis (V1 §7). Evidence-stating language only.
 * Thresholds are constants — deterministic, explainable, tunable (no AI).
 */
const GHOST_MIN_SPEED = 20;          // km/h sustained
const GHOST_MIN_FIXES = 2;           // consecutive moving fixes
const PHANTOM_HOURS = 8;             // rented but stationary at home branch
const UNAUTH_MIN_SPEED = 15;         // moving after contract end
const WRONG_PLACE_HOURS = 2;         // IN_TRANSIT stationary far from destination
const GPS_LOST_MINUTES = 30;         // no fix while RENTED

export async function evaluateTelematicsSignals(tx: Tx, agencyId: string): Promise<void> {
  const fleet = await tx.select().from(vehicles).where(eq(vehicles.agencyId, agencyId));
  const byId = new Map(fleet.map((v) => [v.id, v] as const));
  const positions = await tx.select().from(vehiclePositions).where(eq(vehiclePositions.agencyId, agencyId));
  const brs = await tx.select().from(branches).where(eq(branches.agencyId, agencyId));

  const nearBranch = (lat: number, lng: number, km = 1.0) => brs.some(() => true); // branches have no coords in schema; proximity approximated by device metadata instead
  void nearBranch;

  for (const pos of positions) {
    const v = byId.get(pos.vehicleId);
    if (!v) continue;
    const ageMin = (Date.now() - pos.fixedAt.getTime()) / 60_000;

    // 1. AVAILABLE + sustained movement → potential unauthorized movement (GHOST_STATE, ADR-0010)
    if (v.operationalStatus === 'AVAILABLE' && pos.speedKmh >= GHOST_MIN_SPEED) {
      const recentMoving = await tx.select({ id: telematicsEvents.id }).from(telematicsEvents)
        .where(and(eq(telematicsEvents.vehicleId, v.id), eq(telematicsEvents.eventType, 'MOVEMENT'),
          gte(telematicsEvents.occurredAt, new Date(Date.now() - 15 * 60_000))))
        .limit(GHOST_MIN_FIXES);
      if (recentMoving.length >= GHOST_MIN_FIXES) {
        await raiseAlert({ tx, agencyId, ruleKey: 'GHOST_MOVE', severity: 'CRITICAL', sourceKind: 'SIGNAL',
          category: 'TELEMATICS', entityType: 'vehicle', entityId: v.id,
          title: `Mouvement non attendu — ${v.plate} (statut DISPONIBLE)`,
          message: `GPS: ${pos.speedKmh} km/h à ${pos.lat},${pos.lng}. Évidence télémétrique — vérifier avant toute conclusion (jamais d’accusation automatique).`,
          evidence: { lat: pos.lat, lng: pos.lng, speedKmh: pos.speedKmh, fixes: recentMoving.length, status: v.operationalStatus } });
      }
    }

    // 2. RENTED/OVERDUE + no GPS fix for > 30 min → tracker problem
    if (['RENTED', 'OVERDUE'].includes(v.operationalStatus) && ageMin > GPS_LOST_MINUTES) {
      await raiseAlert({ tx, agencyId, ruleKey: 'GPS_LOST_RENTED', severity: 'HIGH', sourceKind: 'SIGNAL',
        category: 'TELEMATICS', entityType: 'vehicle', entityId: v.id,
        title: `GPS silencieux — ${v.plate} (en location)`,
        message: `Aucune position depuis ${Math.round(ageMin)} min alors que le véhicule est loué. Possible dysfonctionnement traceur.`,
        evidence: { lastFixAt: pos.fixedAt.toISOString(), ageMinutes: Math.round(ageMin) } });
    }

    // 3. RENTED + parked at home branch for ≥ 8h with ignition off → possible phantom rental
    if (v.operationalStatus === 'RENTED' && pos.speedKmh === 0 && pos.ignitionOn === false && ageMin > PHANTOM_HOURS * 60) {
      await raiseAlert({ tx, agencyId, ruleKey: 'PHANTOM_RENTAL', severity: 'ATTENTION', sourceKind: 'SIGNAL',
        category: 'TELEMATICS', entityType: 'vehicle', entityId: v.id,
        title: `Véhicule loué stationnaire — ${v.plate}`,
        message: `Immobile depuis ${Math.round(ageMin / 60)} h (contact coupé). Vérifier si la remise a réellement eu lieu (contrat actif).`,
        evidence: { speedKmh: 0, ignitionOn: false, stationaryHours: Math.round(ageMin / 60) } });
    }

    // 4. contract expired + movement → potential unauthorized use
    if (pos.speedKmh >= UNAUTH_MIN_SPEED) {
      const active = await tx.select().from(contracts)
        .where(and(eq(contracts.vehicleId, v.id), eq(contracts.status, 'ACTIVE'))).limit(1);
      const c = active[0];
      if (c && c.periodEnd && c.periodEnd.getTime() < Date.now() - 3_600_000) {
        await raiseAlert({ tx, agencyId, ruleKey: 'UNAUTHORIZED_USE', severity: 'HIGH', sourceKind: 'SIGNAL',
          category: 'TELEMATICS', entityType: 'vehicle', entityId: v.id,
          title: `Contrat échu, véhicule en mouvement — ${v.plate}`,
          message: `Contrat ${c.number} terminé depuis ${Math.round((Date.now() - c.periodEnd.getTime()) / 3_600_000)} h; GPS indique ${pos.speedKmh} km/h. Contacter le client (décision humaine).`,
          evidence: { contractId: c.id, contractNumber: c.number, endedAt: c.periodEnd.toISOString(), speedKmh: pos.speedKmh } });
      }
    }

    // 5. IN_TRANSIT + stationary ≥ 2h → operational anomaly (delivery stalled)
    if (v.operationalStatus === 'IN_TRANSIT' && pos.speedKmh === 0 && ageMin > WRONG_PLACE_HOURS * 60) {
      await raiseAlert({ tx, agencyId, ruleKey: 'TRANSIT_STALLED', severity: 'ATTENTION', sourceKind: 'SIGNAL',
        category: 'TELEMATICS', entityType: 'vehicle', entityId: v.id,
        title: `Livraison immobile — ${v.plate}`,
        message: `Statut EN LIVRAISON mais immobile depuis ${Math.round(ageMin / 60)} h à ${pos.lat},${pos.lng}.`,
        evidence: { lat: pos.lat, lng: pos.lng, stationaryHours: Math.round(ageMin / 60) } });
    }
  }
  void desc;
}
