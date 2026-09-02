import { describe, expect, it } from 'vitest';
import { calculateSettlement, SettlementError, type SettlementLine } from './settlement.js';

const line = (kind: SettlementLine['kind'], amount: bigint, code = kind) => ({
  code, label: code, kind, amount,
});

describe('calculateSettlement', () => {
  it('calculates base rental plus operational charges and discounts', () => {
    const result = calculateSettlement({
      currency: 'MAD',
      lines: [
        line('RENTAL', 140_000n),
        line('EXTENSION', 35_000n),
        line('FUEL', 12_500n),
        line('DAMAGE', 20_000n),
        line('DISCOUNT', -7_500n),
      ],
      payments: [],
    });

    expect(result.charges).toBe(207_500n);
    expect(result.discounts).toBe(7_500n);
    expect(result.grossTotal).toBe(200_000n);
    expect(result.balanceDue).toBe(200_000n);
  });

  it('applies ordinary payments without treating a held deposit as revenue', () => {
    const result = calculateSettlement({
      currency: 'MAD',
      lines: [line('RENTAL', 140_000n)],
      payments: [{ id: 'p1', amount: 100_000n, direction: 'IN', currency: 'MAD' }],
      deposit: { id: 'd1', heldAmount: 100_000n, chargedAmount: 0n },
    });

    expect(result.incomingPayments).toBe(100_000n);
    expect(result.depositApplied).toBe(0n);
    expect(result.depositRefund).toBe(100_000n);
    expect(result.paidAgainstCharges).toBe(100_000n);
    expect(result.balanceDue).toBe(40_000n);
    expect(result.customerRefund).toBe(100_000n);
  });

  it('applies only the charged part of the deposit and releases the remainder', () => {
    const result = calculateSettlement({
      currency: 'MAD',
      lines: [line('RENTAL', 140_000n)],
      payments: [{ id: 'p1', amount: 140_000n, direction: 'IN', currency: 'MAD' }],
      deposit: { id: 'd1', heldAmount: 100_000n, chargedAmount: 30_000n },
    });

    expect(result.depositApplied).toBe(30_000n);
    expect(result.depositRemaining).toBe(70_000n);
    expect(result.depositRefund).toBe(70_000n);
    expect(result.balanceDue).toBe(0n);
    expect(result.overpayment).toBe(30_000n);
    expect(result.customerRefund).toBe(100_000n);
  });

  it('does not double-count a deposit application payment', () => {
    const result = calculateSettlement({
      currency: 'MAD',
      lines: [line('RENTAL', 100_000n), line('DAMAGE', 40_000n)],
      payments: [
        { id: 'rent', amount: 100_000n, direction: 'IN', currency: 'MAD' },
        { id: 'deposit-charge', amount: 40_000n, direction: 'IN', currency: 'MAD', purpose: 'DAMAGE', countsTowardCharges: false },
      ],
      deposit: { id: 'd1', heldAmount: 40_000n, chargedAmount: 40_000n, releasedAmount: 0n },
    });

    expect(result.incomingPayments).toBe(100_000n);
    expect(result.depositApplied).toBe(40_000n);
    expect(result.paidAgainstCharges).toBe(140_000n);
    expect(result.balanceDue).toBe(0n);
    expect(result.overpayment).toBe(0n);
  });

  it('handles underpayment, overpayment and an existing refund', () => {
    const underpaid = calculateSettlement({
      currency: 'MAD',
      lines: [line('RENTAL', 140_000n)],
      payments: [{ id: 'p1', amount: 100_000n, direction: 'IN', currency: 'MAD' }],
    });
    expect(underpaid.balanceDue).toBe(40_000n);
    expect(underpaid.overpayment).toBe(0n);

    const overpaid = calculateSettlement({
      currency: 'MAD',
      lines: [line('RENTAL', 100_000n)],
      payments: [{ id: 'p1', amount: 120_000n, direction: 'IN', currency: 'MAD' }],
    });
    expect(overpaid.balanceDue).toBe(0n);
    expect(overpaid.overpayment).toBe(20_000n);
    expect(overpaid.customerRefund).toBe(20_000n);

    const refunded = calculateSettlement({
      currency: 'MAD',
      lines: [line('RENTAL', 100_000n)],
      payments: [
        { id: 'p1', amount: 120_000n, direction: 'IN', currency: 'MAD' },
        { id: 'r1', amount: 10_000n, direction: 'OUT', currency: 'MAD', reversesPaymentId: 'p1' },
      ],
    });
    expect(refunded.netPayments).toBe(110_000n);
    expect(refunded.overpayment).toBe(10_000n);
    expect(refunded.customerRefund).toBe(10_000n);
  });

  it('uses settlementAmount for foreign-currency payments when supplied', () => {
    const result = calculateSettlement({
      currency: 'MAD',
      lines: [line('RENTAL', 100_000n)],
      payments: [{ id: 'p1', amount: 50_000n, settlementAmount: 60_000n, direction: 'IN', currency: 'EUR' }],
    });
    expect(result.incomingPayments).toBe(60_000n);
    expect(result.balanceDue).toBe(40_000n);
  });

  it('rejects invalid deposit arithmetic and negative totals', () => {
    expect(() => calculateSettlement({
      currency: 'MAD', lines: [line('RENTAL', 100_000n)], payments: [],
      deposit: { id: 'd1', heldAmount: 50_000n, chargedAmount: 60_000n },
    })).toThrow(SettlementError);

    expect(() => calculateSettlement({
      currency: 'MAD', lines: [line('DISCOUNT', -10_000n)], payments: [],
    })).toThrow(SettlementError);
  });
});
