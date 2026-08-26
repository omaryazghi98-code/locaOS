import { describe, expect, it } from 'vitest';
import { blankContractContent } from './contract.js';
import { recalculateContractPricing } from './contractPricing.js';

describe('contract amendment pricing', () => {
  it('recalculates days and rental line without losing extras', () => {
    const content = blankContractContent({
      agencyName: 'Atlas Rent SARL', agencyIce: 'ICE', branchName: 'Tétouan',
      contractNumber: 'L-2026-00001', language: 'fr',
    });
    const pricing = {
      ...content.pricing,
      lines: [
        { code: 'RENTAL', label: 'Location', qty: 4, unitAmount: '350.00', total: '1400.00' },
        { code: 'DELIVERY', label: 'Livraison', qty: 1, unitAmount: '100.00', total: '100.00' },
      ],
      subtotal: '1500.00', dailyRate: '350.00', days: '4', discount: '100.00', total: '1400.00', currency: 'MAD',
    };

    const next = recalculateContractPricing(pricing, { days: 10 });

    expect(next.days).toBe('10');
    expect(next.lines[0]).toMatchObject({ qty: 10, unitAmount: '350.00', total: '3500.00' });
    expect(next.lines[1]).toMatchObject({ code: 'DELIVERY', total: '100.00' });
    expect(next.subtotal).toBe('3600.00');
    expect(next.total).toBe('3500.00');
  });

  it('changes the daily rate while keeping non-rental lines intact', () => {
    const pricing = {
      lines: [
        { code: 'RENTAL', label: 'Location', qty: 5, unitAmount: '300.00', total: '1500.00' },
        { code: 'EXTRA_CHILD', label: 'Siège enfant', qty: 1, unitAmount: '80.00', total: '80.00' },
      ],
      subtotal: '1580.00', dailyRate: '300.00', days: '5', discount: '0.00', total: '1580.00', currency: 'MAD',
    } as any;

    const next = recalculateContractPricing(pricing, { dailyRate: '420.00' });

    expect(next.dailyRate).toBe('420.00');
    expect(next.lines[0]).toMatchObject({ unitAmount: '420.00', total: '2100.00' });
    expect(next.lines[1]).toMatchObject({ code: 'EXTRA_CHILD', total: '80.00' });
    expect(next.subtotal).toBe('2180.00');
    expect(next.total).toBe('2180.00');
  });
});
