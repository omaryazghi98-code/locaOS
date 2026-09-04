import { ConflictException } from '@nestjs/common';

export const assertActivationDepositCoverage = (requiredAmount: bigint, securedAmount: bigint) => {
  if (requiredAmount <= 0n) return;
  if (securedAmount >= requiredAmount) return;

  throw new ConflictException({
    error: {
      code: 'DEPOSIT_AMOUNT_INSUFFICIENT',
      message: 'La caution sécurisée est inférieure à la caution requise',
      requiredCents: requiredAmount.toString(),
      securedCents: securedAmount.toString(),
      missingCents: (requiredAmount - securedAmount).toString(),
    },
  });
};
