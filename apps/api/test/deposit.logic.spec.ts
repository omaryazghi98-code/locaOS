import { describe, expect, it } from 'vitest';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { assertDepositCoversRequiredAmount, assertDepositChargeWithinRemainingAmount } from '../src/modules/finance/deposit.logic';

describe('deposit integrity logic', () => {
  it('rejects activation when secured deposit is below required amount', () => {
    expect(() => assertDepositCoversRequiredAmount(300000n, 400000n)).toThrow(ConflictException);
    try {
      assertDepositCoversRequiredAmount(300000n, 400000n);
    } catch (error) {
      expect((error as ConflictException).getResponse()).toMatchObject({
        error: { code: 'DEPOSIT_AMOUNT_INSUFFICIENT', missingCents: '100000' },
      });
    }
  });

  it('accepts a secured deposit at or above the required amount', () => {
    expect(() => assertDepositCoversRequiredAmount(400000n, 400000n)).not.toThrow();
    expect(() => assertDepositCoversRequiredAmount(500000n, 400000n)).not.toThrow();
  });

  it('rejects a deposit charge above the remaining secured amount', () => {
    expect(() => assertDepositChargeWithinRemainingAmount(400000n, 300000n, 100001n)).toThrow(ConflictException);
    try {
      assertDepositChargeWithinRemainingAmount(400000n, 300000n, 100001n);
    } catch (error) {
      expect((error as ConflictException).getResponse()).toMatchObject({
        error: { code: 'DEPOSIT_CHARGE_EXCEEDS_REMAINING', remainingCents: '100000', requestedCents: '100001' },
      });
    }
  });

  it('rejects zero or negative deposit charges', () => {
    expect(() => assertDepositChargeWithinRemainingAmount(400000n, 0n, 0n)).toThrow(BadRequestException);
  });

  it('allows a charge exactly equal to the remaining secured amount', () => {
    expect(() => assertDepositChargeWithinRemainingAmount(400000n, 300000n, 100000n)).not.toThrow();
  });
});
