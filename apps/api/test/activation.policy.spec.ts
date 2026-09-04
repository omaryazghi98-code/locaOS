import { describe, expect, it } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { assertActivationDepositCoverage } from '../src/modules/contracts/activation.policy';

describe('contract activation deposit policy', () => {
  it('allows activation when no deposit is required', () => {
    expect(() => assertActivationDepositCoverage(0n, 0n)).not.toThrow();
  });

  it('allows activation when the secured amount covers the requirement', () => {
    expect(() => assertActivationDepositCoverage(50000n, 50000n)).not.toThrow();
    expect(() => assertActivationDepositCoverage(50000n, 75000n)).not.toThrow();
  });

  it('rejects an insufficient secured amount with a stable error code', () => {
    try {
      assertActivationDepositCoverage(100000n, 60000n);
      throw new Error('expected activation to be rejected');
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toEqual({
        error: {
          code: 'DEPOSIT_AMOUNT_INSUFFICIENT',
          message: 'La caution sécurisée est inférieure à la caution requise',
          requiredCents: '100000',
          securedCents: '60000',
          missingCents: '40000',
        },
      });
    }
  });
});
