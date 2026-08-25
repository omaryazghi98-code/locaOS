import type { ContractContent } from '@locaos/domain';
import { T, type Lang } from './templates.js';

const money = (v: string | null) => (v == null || v === '' ? '………………' : v);
const val = (v: string | null | undefined) => (v == null || v === '' ? '………………………………' : v);
const dt = (v: string | null | undefined) => {
  if (!v) return '………………………………';
  try {
    return new Intl.DateTimeFormat('fr-MA', { timeZone: 'Africa/Casablanca', dateStyle: 'short', timeStyle: 'short' }).format(new Date(v));
  } catch { return v; }
};
const yn = (v: boolean | null) => (v == null ? '☐ Oui ☐ Non' : v ? 'Oui' : 'Non');

/** Structured content → print-ready HTML. The renderer only consumes the immutable contract snapshot. */
export function buildContractHtml(content: ContractContent): string {
  const lang = content.header.language as Lang;
  const t = T[lang] ?? T.fr;
  const rtl = lang === 'ar' ? ' dir="rtl" lang="ar"' : '';
  const h = content.header;
  const s = content.snapshot;
  const c = content.customer, v = content.vehicle, p = content.period, pr = content.pricing;
  const d = content.deposit, ins = content.insurance, cb = content.crossBorder, mf = content.mileageFuel;

  const row = (label: string, value: string, wide = false) =>
    `<tr><th>${label}</th><td class="${wide ? 'wide' : ''}">${value}</td></tr>`;
  const blankBanner = h.mode === 'BLANK' ? `<div class="blank-banner">${t.blankNote}</div>` : '';

  return `<!doctype html><html${rtl}><head><meta charset="utf-8"><style>
  :root { color-scheme: light; }
  body { font-family: 'ContractLatin','ContractArabic',sans-serif; font-size: 12px; margin: 26px 30px; color: #111; line-height: 1.45; }
  h1 { font-size: 15px; text-align:center; margin: 0 0 2px; letter-spacing: .4px; }
  .meta { display:flex; justify-content:space-between; font-size: 11px; margin-bottom: 10px; border-bottom: 2px solid #111; padding-bottom: 6px; gap: 14px; }
  section { margin-top: 10px; }
  h2 { font-size: 12px; border-bottom: 1px solid #999; padding-bottom: 2px; margin: 0 0 4px; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: start; width: 34%; font-weight: 600; padding: 3px 6px 3px 0; vertical-align: top; }
  td { padding: 3px 0; border-bottom: 1px dotted #bbb; }
  td.wide { border-bottom: 1px solid #111; min-height: 18px; }
  .blank-banner { border: 2px dashed #b45309; color: #b45309; padding: 6px 10px; font-weight: 700; text-align: center; margin: 8px 0; }
  .clauses li { margin-bottom: 3px; }
  .signatures { display: flex; gap: 40px; margin-top: 26px; }
  .sig { flex: 1; border-top: 1px solid #111; padding-top: 4px; min-height: 52px; }
  .sig .label { font-weight: 700; }
  footer { margin-top: 18px; font-size: 10px; color: #555; display:flex; justify-content:space-between; }
  .note { font-size: 10.5px; color: #444; margin-top: 2px; }
</style></head><body>
<h1>${t.title}</h1>
<div class="meta"><span>${h.agencyName}${h.agencyIce ? ' — ICE ' + h.agencyIce : ''}</span><span>${t.ref}: <b>${h.contractNumber}</b></span><span>${h.branchName ?? ''}</span></div>
${blankBanner}
<section><h2>${t.parties}</h2><table>
${row(t.parties, val(c.name))}${row(t.cin, val(c.cinOrPassport))}${row(t.license, val(c.licenseNumber))}
${row(t.licenseIssued, val(c.licenseIssuedOn))}${row(t.birthDate, val(c.birthDate))}${row(t.phone, val(c.phone))}
${row(t.address, val(c.address), true)}
</table></section>
<section><h2>${t.vehicleSection}</h2><table>
${row(t.plate, val(v.plate))}${row(t.makeModel, val(v.makeModel))}${row(t.category, val(v.category))}
${row(t.vin, val(v.vin))}${row(t.mileageOut, val(v.mileageOut))}${row(t.fuelOut, val(v.fuelOut))}
</table></section>
<section><h2>${t.periodSection}</h2><table>
${row(t.pickupAt, dt(p.pickupAt))}${row(t.returnAt, dt(p.returnAt))}${row(t.days, val(p.days))}
${row(t.pickupBranch, val(p.pickupBranch))}${row(t.returnBranch, val(p.returnBranch))}
</table></section>
<section><h2>${t.pricingSection}</h2><table>
${row('Sous-total', money(pr.subtotal) + ' ' + pr.currency)}${row(t.dailyRate, money(pr.dailyRate) + ' ' + pr.currency)}${row(t.discount, money(pr.discount) + ' ' + pr.currency)}
${row(t.total, `<b>${money(pr.total)} ${pr.currency}</b>`)}
</table></section>
<section><h2>${t.depositSection}</h2><table>
${row(t.depositAmount, money(d.amount) + ' MAD')}${row(t.depositMethod, val(d.method))}${row('Statut', val(d.status))}${row(t.heldAt, dt(d.heldAt))}
</table></section>
<section><h2>${t.insuranceSection}</h2><table>
${row(t.franchise, money(ins.franchiseAmount != null ? String(Number(ins.franchiseAmount) / 100) : null) + ' MAD')}
${row(t.cdw, yn(ins.cdw))}${row(t.superCdw, yn(ins.superCdw))}
${row(t.exclusions, ins.exclusions?.join(' · ') ?? '………………………………')}
</table></section>
<section><h2>${t.crossBorderSection}</h2><table>
${row(t.authorized, yn(cb.authorized))}${row(t.zones, val((cb.zones ?? []).join(', ')))}${row(t.atRef, val(cb.admissionTemporaireRef))}
</table><div class="note">${t.crossBorderNote}</div></section>
<section><h2>${t.mileageFuelSection}</h2><table>
${row(t.includedKm, val(mf.includedKmPerDay))}${row(t.extraKmRate, val(mf.extraKmRate))}
${row(t.mileageIn, val(mf.mileageIn))}${row(t.fuelIn, val(mf.fuelIn))}
</table></section>
<section><h2>${t.driversSection}</h2><table>
${(content.drivers ?? []).map((dr) => row(val(dr.name), `${t.driverLicense}: ${val(dr.licenseNumber)} — ${t.driverBirth}: ${val(dr.birthDate)}`)).join('') || `<tr><td class="wide"></td></tr>`}
</table></section>
<section><h2>${t.consentsSection}</h2><table>
${row(t.consentGps, yn(content.consents?.find((x) => x.purpose === 'GPS_TRACKING')?.granted ?? null))}
${row(t.consentMarketing, yn(content.consents?.find((x) => x.purpose === 'MARKETING')?.granted ?? null))}
${row(t.consentData, yn(content.consents?.find((x) => x.purpose === 'DATA_PROCESSING')?.granted ?? null))}
</table></section>
<section><h2>${t.clauses.length ? '—' : ''}</h2><ol class="clauses">${t.clauses.map((cl) => `<li>${cl}</li>`).join('')}</ol></section>
<div class="note">Capture ${dt(s.capturedAt)} · Réservation ${val(s.reservationId)} · Devis ${val(s.quoteId)} v${val(s.quoteVersion)}</div>
<div class="signatures">
  <div class="sig"><div class="label">${t.customerSig}</div><div>${val(content.signatures.customer.name)} — ${dt(content.signatures.customer.at)}</div></div>
  <div class="sig"><div class="label">${t.agentSig}</div><div>${val(content.signatures.agent.name)} — ${dt(content.signatures.agent.at)}</div></div>
</div>
<footer><span>${t.at} ${dt(h.issuedAt)}</span><span>${t.page}</span></footer>
</body></html>`;
}
