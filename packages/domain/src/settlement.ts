import type { Currency } from './money.js';

export type SettlementLineKind =
  | 'RENTAL'
  | 'EXTENSION'
  | 'LATE_RETURN'
  | 'MILEAGE'
  | 'FUEL'
  | 'EXTRA'
  | 'FEE'
  | 'FINE'
  | 'DAMAGE'
  | 'DISCOUNT'
  | 'OTHER';

export type SettlementLine = {
  code: string;
  label: string;
  kind: SettlementLineKind;
  amount: bigint;
  /** Negative lines are credits/discounts. */
  sourceId?: string;
};

export type SettlementPayment = {
  id: string;
  amount: bigint;
  direction: 'IN' | 'OUT';
  currency: Currency | string;
  /** Amount normalized into the settlement currency's minor units. */
  settlementAmount?: bigint;
  purpose?: string | null;
  reversesPaymentId?: string | null;
  /** Deposit applications are represented separately by depositApplied and must not be counted as cash twice. */
  countsTowardCharges?: boolean;
};

export type SettlementDeposit = {
  id: string;
  heldAmount: bigint;
  /** Amount already applied against the final customer charges. */
  chargedAmount: bigint;
  /** Optional explicit release/refund amount. If omitted, it is derived. */
  releasedAmount?: bigint;
};

export type SettlementInput = {
  currency: Currency | string;
  lines: SettlementLine[];
  payments: SettlementPayment[];
  deposit?: SettlementDeposit | null;
};

export type SettlementResult = {
  currency: Currency | string;
  lines: SettlementLine[];
  charges: bigint;
  discounts: bigint;
  grossTotal: bigint;
  incomingPayments: bigint;
  outgoingPayments: bigint;
  netPayments: bigint;
  depositHeld: bigint;
  depositApplied: bigint;
  depositRefund: bigint;
  depositRemaining: bigint;
  paidAgainstCharges: bigint;
  balanceDue: bigint;
  overpayment: bigint;
  customerRefund: bigint;
};

/**
 * Calculates the final rental account from immutable charge lines and recorded
 * financial movements. This function has no database or transport concerns and
 * is the single arithmetic source of truth for close-time settlement.
 *
 * Deposit application is deliberately separated from ordinary payments:
 * holding a deposit is not revenue and a deposit application must not be counted
 * once as a payment and again as a deposit credit.
 */
export function calculateSettlement(input: SettlementInput): SettlementResult {
  const depositHeld = input.deposit?.heldAmount ?? 0n;
  const requestedDepositCharge = input.deposit?.chargedAmount ?? 0n;
  assertNonNegative('deposit.heldAmount', depositHeld);
  assertNonNegative('deposit.chargedAmount', requestedDepositCharge);
  if (requestedDepositCharge > depositHeld) {
    throw new SettlementError('Deposit charge exceeds held deposit');
  }

  const lines = input.lines.map((line) => ({ ...line }));
  const positiveCharges = lines.reduce((sum, line) => line.amount > 0n ? sum + line.amount : sum, 0n);
  const discounts = lines.reduce((sum, line) => line.amount < 0n ? sum + (-line.amount) : sum, 0n);
  const grossTotal = positiveCharges - discounts;
  if (grossTotal < 0n) throw new SettlementError('Settlement total cannot be negative');

  const depositApplied = minBigInt(requestedDepositCharge, grossTotal, depositHeld);
  const depositRemaining = depositHeld - depositApplied;
  const derivedDepositRefund = depositRemaining;
  const depositRefund = input.deposit?.releasedAmount == null
    ? derivedDepositRefund
    : input.deposit.releasedAmount;
  assertNonNegative('deposit.releasedAmount', depositRefund);
  if (depositApplied + depositRefund > depositHeld) {
    throw new SettlementError('Deposit application and release exceed held deposit');
  }

  const countedPayments = input.payments.filter((payment) => payment.countsTowardCharges !== false);
  const incomingPayments = countedPayments.reduce((sum, payment) => {
    const amount = normalizedPaymentAmount(payment);
    return payment.direction === 'IN' ? sum + amount : sum;
  }, 0n);
  const outgoingPayments = countedPayments.reduce((sum, payment) => {
    const amount = normalizedPaymentAmount(payment);
    return payment.direction === 'OUT' ? sum + amount : sum;
  }, 0n);
  const netPayments = incomingPayments - outgoingPayments;
  const availableCredit = maxBigInt(0n, netPayments) + depositApplied;

  const paidAgainstCharges = minBigInt(grossTotal, availableCredit);
  const balanceDue = grossTotal - paidAgainstCharges;
  const overpayment = maxBigInt(0n, availableCredit - grossTotal);
  const customerRefund = maxBigInt(0n, depositRefund + overpayment);

  return {
    currency: input.currency,
    lines,
    charges: positiveCharges,
    discounts,
    grossTotal,
    incomingPayments,
    outgoingPayments,
    netPayments,
    depositHeld,
    depositApplied,
    depositRefund,
    depositRemaining,
    paidAgainstCharges,
    balanceDue,
    overpayment,
    customerRefund,
  };
}

export class SettlementError extends Error {}

function normalizedPaymentAmount(payment: SettlementPayment): bigint {
  const amount = payment.settlementAmount ?? payment.amount;
  assertNonNegative(`payment.${payment.id}.amount`, amount);
  return amount;
}

function minBigInt(...values: bigint[]): bigint {
  return values.reduce((min, value) => value < min ? value : min);
}

function maxBigInt(a: bigint, b: bigint): bigint {
  return a > b ? a : b;
}

function assertNonNegative(field: string, amount: bigint): void {
  if (amount < 0n) throw new SettlementError(`${field} cannot be negative`);
}
