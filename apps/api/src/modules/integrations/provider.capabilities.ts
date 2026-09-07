/**
 * Stable capability keys shared by provider adapters and consumers.
 *
 * Keep these keys domain-neutral. A provider can expose a capability without
 * becoming the source of truth for the rental domain.
 */
export const INTEGRATION_CAPABILITY = {
  OCR_TEXT: 'ocr.text',
  OCR_STRUCTURED_FIELDS: 'ocr.structured_fields',
  PAYMENT_AUTHORIZE: 'payments.authorize',
  PAYMENT_CAPTURE: 'payments.capture',
  PAYMENT_REFUND: 'payments.refund',
  MESSAGE_SEND: 'messaging.send',
  SIGNATURE_REQUEST: 'signature.request',
  TELEMATICS_POSITION: 'telematics.position',
  TELEMATICS_TRIPS: 'telematics.trips',
  TELEMATICS_GEOFENCE: 'telematics.geofence',
  MAP_RENDER: 'maps.render',
  MAP_GEOCODE: 'maps.geocode',
  ROUTE_CALCULATE: 'routing.calculate',
  ROUTE_MATRIX: 'routing.matrix',
  ROUTE_MATCH_TRACE: 'routing.match_trace',
  ACCOUNTING_EXPORT: 'accounting.export',
  ACCOUNTING_SYNC: 'accounting.sync',
} as const;

export type IntegrationCapabilityKey = (typeof INTEGRATION_CAPABILITY)[keyof typeof INTEGRATION_CAPABILITY];
