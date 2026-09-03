import { BadRequestException } from '@nestjs/common';

export type DepositHandling = 'DIRECT' | 'PARTNER' | 'CARD_PREAUTH';
export type DepositCustody = 'AGENCY' | 'PARTNER' | 'EXTERNAL';

export const resolveDepositCustody = (handling: DepositHandling): DepositCustody => {
  switch (handling) {
    case 'DIRECT':
      return 'AGENCY';
    case 'PARTNER':
      return 'PARTNER';
    case 'CARD_PREAUTH':
      return 'EXTERNAL';
  }
};

export const assertDepositHandlingInput = (handling: DepositHandling, provider?: string) => {
  if (handling === 'PARTNER' && !provider?.trim()) {
    throw new BadRequestException('Un prestataire est requis pour une caution gérée par un partenaire');
  }
  if (handling === 'CARD_PREAUTH' && !provider?.trim()) {
    throw new BadRequestException('Un prestataire est requis pour une pré-autorisation carte');
  }
};
