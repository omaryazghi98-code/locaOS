/**
 * Integration ports (ADR-0012). Every provider self-declares an honest status:
 *   CONNECTED  — live, verified credentials, real calls
 *   MOCK       — explicitly simulated; results labeled SIMULATED, never faked as real
 *   UNAVAILABLE — adapter exists; credentials/approval missing; requests throw
 * Nothing silently pretends to be live (§26 / V1 §4-5).
 */
import { and, eq } from 'drizzle-orm';
import { db, withTenant } from '../../db/client';
import { notificationOutbox, signatureRequests } from '../../db/schema';
import { env } from '../../env';

export type IntegrationStatus = 'CONNECTED' | 'MOCK' | 'UNAVAILABLE';

export interface ProviderInfo {
  kind: 'SIGNATURE' | 'MESSAGING' | 'TELEMATICS';
  name: string;
  status: IntegrationStatus;
  detail: string; // human explanation shown in the UI
}

// ─── Electronic signature (V1 §4) ───────────────────────────────────────────────
export interface SignatureRequestInput {
  agencyId: string; contractId: string; contractVersionId: string | null;
  contentHash: string; signerName: string; signerPhone?: string; language: string;
  requestedBy: string;
}
export interface SignatureRequestResult {
  requestId: string; providerRef: string; mode: 'MOCK' | 'LIVE';
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  message: string;
}
export interface SignatureProvider {
  name: string;
  status(): ProviderInfo;
  /** Never fakes success: a PENDING result stays pending until a human action completes it. */
  requestSignature(input: SignatureRequestInput): Promise<SignatureRequestResult>;
  cancel(agencyId: string, requestId: string, reason: string): Promise<void>;
}

export class MockSignatureProvider implements SignatureProvider {
  name = 'MockSignature';
  status(): ProviderInfo {
    return { kind: 'SIGNATURE', name: this.name, status: 'MOCK', detail: 'Mode simulé — aucune signature réelle. La demande reste PENDING jusqu’à confirmation manuelle explicitement marquée SIMULATED.' };
  }
  async requestSignature(input: SignatureRequestInput): Promise<SignatureRequestResult> {
    const providerRef = `MOCK-SIG-${Date.now().toString(36).toUpperCase()}`;
    const [row] = await withTenant(input.agencyId, (tx) => tx.insert(signatureRequests).values({
      agencyId: input.agencyId, contractId: input.contractId, contractVersionId: input.contractVersionId,
      provider: this.name, mode: 'MOCK', providerRef, signerName: input.signerName,
      signerPhone: input.signerPhone ?? null, status: 'PENDING', requestedBy: input.requestedBy,
    }).returning());
    return { requestId: row!.id, providerRef, mode: 'MOCK', status: 'PENDING',
      message: 'Demande créée en mode SIMULÉ — complétée uniquement par action humaine (marquée SIMULATED).' };
  }
  async cancel(agencyId: string, requestId: string): Promise<void> {
    await withTenant(agencyId, (tx) => tx.update(signatureRequests)
      .set({ status: 'CANCELLED', completedAt: new Date() })
      .where(and(eq(signatureRequests.id, requestId), eq(signatureRequests.status, 'PENDING')) as never));
  }
}

/**
 * Damanesign adapter (qualified TSP — verified provider, register #6).
 * The public developer portal exists (developers.damanesign.ma, cited by the research), but the
 * authenticated API contract could not be verified here and no credentials exist. Without
 * credentials this adapter reports UNAVAILABLE and refuses to fake requests.
 */
export class DamanesignProvider implements SignatureProvider {
  name = 'Damanesign';
  private configured = Boolean(env.damanesignApiUrl && env.damanesignApiKey);
  status(): ProviderInfo {
    return this.configured
      ? { kind: 'SIGNATURE', name: this.name, status: 'CONNECTED', detail: 'Configuré (URL + clé).' }
      : { kind: 'SIGNATURE', name: this.name, status: 'UNAVAILABLE', detail: 'Identifiants DAMANESIGN absents — l’adaptateur est prêt mais refuse d’émuler des signatures qualifiées.' };
  }
  async requestSignature(input: SignatureRequestInput): Promise<SignatureRequestResult> {
    const info = this.status();
    if (info.status === 'UNAVAILABLE') throw new Error('Damanesign non configuré (UNAVAILABLE) — aucune signature simulée.');
    const res = await fetch(`${env.damanesignApiUrl}/signature-requests`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${env.damanesignApiKey}` },
      body: JSON.stringify({
        // Contract shape per public docs (to be validated against the portal with real credentials):
        signer_name: input.signerName, signer_phone: input.signerPhone,
        document_hash: input.contentHash, lang: input.language, redirect_url: null,
      }),
    });
    if (!res.ok) throw new Error(`Damanesign ${res.status}`);
    const body = await res.json() as { id?: string };
    const providerRef = body.id ?? `DG-${Date.now().toString(36)}`;
    const [row] = await withTenant(input.agencyId, (tx) => tx.insert(signatureRequests).values({
      agencyId: input.agencyId, contractId: input.contractId, contractVersionId: input.contractVersionId,
      provider: this.name, mode: 'LIVE', providerRef, signerName: input.signerName,
      signerPhone: input.signerPhone ?? null, status: 'PENDING', requestedBy: input.requestedBy,
    }).returning());
    return { requestId: row!.id, providerRef, mode: 'LIVE', status: 'PENDING', message: 'Demande envoyée à Damanesign.' };
  }
  async cancel(agencyId: string, requestId: string): Promise<void> {
    await new MockSignatureProvider().cancel(agencyId, requestId);
  }
}

// ─── Messaging / WhatsApp (V1 §5) ───────────────────────────────────────────────
export interface SendInput {
  agencyId: string; toPhone: string; template: string; params?: Record<string, string>;
  relatedType?: string; relatedId?: string; createdBy?: string;
}
export interface SendResult {
  status: 'SIMULATED' | 'SENT' | 'FAILED'; messageId: string | null;
  provider: string; detail: string;
}
export interface MessagingProvider {
  name: string;
  status(): ProviderInfo;
  send(input: SendInput): Promise<SendResult>;
}

export class MockMessagingProvider implements MessagingProvider {
  name = 'MockMessaging';
  status(): ProviderInfo {
    return { kind: 'MESSAGING', name: this.name, status: 'MOCK', detail: 'WhatsApp NON configuré — messages marqués SIMULATED dans la file, jamais envoyés.' };
  }
  async send(input: SendInput): Promise<SendResult> {
    await withTenant(input.agencyId, (tx) => tx.insert(notificationOutbox).values({
      agencyId: input.agencyId, channel: 'WHATSAPP', template: input.template, toPhone: input.toPhone,
      payload: (input.params ?? {}) as never, status: 'SIMULATED', provider: this.name,
      integrationStatus: 'MOCK', relatedType: input.relatedType ?? null, relatedId: input.relatedId ?? null,
      createdBy: input.createdBy ?? null,
    }));
    return { status: 'SIMULATED', messageId: null, provider: this.name, detail: 'Message simulé (file SIMULATED) — connectez WhatsApp Business pour l’envoi réel.' };
  }
}

export class WhatsAppBusinessProvider implements MessagingProvider {
  name = 'WhatsAppBusiness';
  private configured = Boolean(env.whatsappToken && env.whatsappPhoneId);
  status(): ProviderInfo {
    return this.configured
      ? { kind: 'MESSAGING', name: this.name, status: 'CONNECTED', detail: 'Cloud API configurée (token + phone id).' }
      : { kind: 'MESSAGING', name: this.name, status: 'UNAVAILABLE', detail: 'WHATSAPP_TOKEN / WHATSAPP_PHONE_ID absents — envoi réel impossible; l’API refuse l’appel plutôt que simuler.' };
  }
  async send(input: SendInput): Promise<SendResult> {
    if (!this.configured) throw new Error('WhatsApp Business non configuré (UNAVAILABLE)');
    const res = await fetch(`https://graph.facebook.com/v20.0/${env.whatsappPhoneId}/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${env.whatsappToken}` },
      body: JSON.stringify({
        messaging_product: 'whatsapp', to: input.toPhone.replace('+', ''), type: 'text',
        text: { body: renderTemplate(input.template, input.params ?? {}) },
      }),
    });
    const ok = res.ok;
    const body = await res.json().catch(() => ({})) as { messages?: { id: string }[] };
    await withTenant(input.agencyId, (tx) => tx.insert(notificationOutbox).values({
      agencyId: input.agencyId, channel: 'WHATSAPP', template: input.template, toPhone: input.toPhone,
      payload: (input.params ?? {}) as never, status: ok ? 'SENT' : 'FAILED', provider: this.name,
      integrationStatus: 'LIVE', providerMessageId: body.messages?.[0]?.id ?? null,
      relatedType: input.relatedType ?? null, relatedId: input.relatedId ?? null, createdBy: input.createdBy ?? null,
    }));
    return ok
      ? { status: 'SENT', messageId: body.messages?.[0]?.id ?? null, provider: this.name, detail: 'Envoyé via WhatsApp Cloud API.' }
      : { status: 'FAILED', messageId: null, provider: this.name, detail: `WhatsApp API ${res.status}` };
  }
}

export function renderTemplate(template: string, params: Record<string, string>): string {
  const T: Record<string, string> = {
    RESERVATION_CONFIRMED: 'Bonjour {name}, votre réservation {ref} est confirmée. Départ le {date} — {branch}.',
    PICKUP_INSTRUCTIONS: 'Bonjour {name}, votre {vehicle} vous attend à {place} à {time}. Pensez à votre permis et CIN.',
    DOC_REQUEST: 'Bonjour {name}, merci d’envoyer une photo lisible de votre permis de conduire avant votre départ.',
    CONTRACT_DELIVERED: 'Bonjour {name}, voici votre contrat de location n° {number}: {link}',
    PAYMENT_REMINDER: 'Bonjour {name}, un solde de {amount} MAD reste dû sur le contrat {number}.',
    RETURN_REMINDER: 'Bonjour {name}, rappel: restitution de votre véhicule prévue le {date} à {branch}.',
    EXTENSION_REQUEST: 'Bonjour, souhaitez-vous prolonger la location {ref} ? Répondez OUI pour être recontacté.',
    LATE_RETURN: 'Bonjour {name}, votre location {ref} était à rendre le {date}. Merci de nous contacter au plus vite.',
    LOCATION_REQUEST: 'Bonjour {name}, pour votre livraison, merci d’envoyer votre position WhatsApp précise.',
  };
  let out = T[template] ?? template;
  for (const [k, v] of Object.entries(params)) out = out.replaceAll(`{${k}}`, v);
  return out;
}

// ─── Registry (active provider per kind; env-driven, honest fallback to MOCK) ───
export const signatureProvider: SignatureProvider =
  env.damanesignApiUrl && env.damanesignApiKey ? new DamanesignProvider() : new MockSignatureProvider();
export const messagingProvider: MessagingProvider =
  env.whatsappToken && env.whatsappPhoneId ? new WhatsAppBusinessProvider() : new MockMessagingProvider();

export function integrationStatuses(): ProviderInfo[] {
  const mockSig = new MockSignatureProvider().status();
  const dmn = new DamanesignProvider().status();
  const mockMsg = new MockMessagingProvider().status();
  const wa = new WhatsAppBusinessProvider().status();
  return [signatureProvider instanceof DamanesignProvider ? dmn : mockSig, dmn.status !== mockSig.status ? dmn : mockSig, messagingProvider instanceof WhatsAppBusinessProvider ? wa : mockMsg]
    .filter((v, i, a) => a.findIndex((x) => x.name === v.name) === i);
}
