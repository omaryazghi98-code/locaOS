import { BadRequestException, ConflictException } from '@nestjs/common';

export const assertDepositCoversRequiredAmount = (securedAmount: bigint, requiredAmount: bigint) => {
  if (securedAmount < requiredAmount) {
    throw new ConflictException({
      error: {
        code: 'DEPOSIT_AMOUNT_INSUFFICIENT',
        message: 'La caution sécurisée est inférieure à la caution requise',
        requiredCents: requiredAmount.toString(),
        securedCents: securedAmount.toString(),
        missingCents: (requiredAmount - securedAmount).toString(),
      },
    });
  }
};

export const assertDepositChargeWithinRemainingAmount = (depositAmount: bigint, alreadyCharged: bigint, requestedCharge: bigint) => {
  if (requestedCharge <= 0n) {
    throw new BadRequestException('Le montant de la retenue doit être supérieur à zéro');
  }
  const remaining = depositAmount - alreadyCharged;
  if (requestedCharge > remaining) {
    throw new ConflictException({
      error: {
        code: 'DEPOSIT_CHARGE_EXCEEDS_REMAINING',
        message: 'La retenue dépasse le montant de caution encore sécurisé',
        depositCents: depositAmount.toString(),
        alreadyChargedCents: alreadyCharged.toString(),
        remainingCents: remaining.toString(),
        requestedCents: requestedCharge.toString(),
      },
    });
  }
};
