import { describe, expect, it } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { assertDepositHandlingInput, resolveDepositCustody } from '../src/modules/finance/deposit.policy';

describe('deposit handling policy', () => {
  it('maps direct handling to agency custody', () => {
    expect(resolveDepositCustody('DIRECT')).toBe('AGENCY');
  });

  it('maps partner handling to partner custody', () => {
    expect(resolveDepositCustody('PARTNER')).toBe('PARTNER');
  });

  it('maps card preauthorization to external custody', () => {
    expect(resolveDepositCustody('CARD_PREAUTH')).toBe('EXTERNAL');
  });

  it('requires a provider for partner handling', () => {
    expect(() => assertDepositHandlingInput('PARTNER')).toThrow(BadRequestException);
  });

  it('requires a provider for card preauthorization', () => {
    expect(() => assertDepositHandlingInput('CARD_PREAUTH')).toThrow(BadRequestException);
  });

  it('allows direct handling without a provider', () => {
    expect(() => assertDepositHandlingInput('DIRECT')).not.toThrow();
  });
});
