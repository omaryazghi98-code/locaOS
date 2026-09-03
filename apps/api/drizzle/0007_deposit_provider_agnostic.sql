-- Provider-agnostic deposit handling: custody semantics are separate from the
-- existing payment rail/method and provider strings. This keeps None as the
-- absence of a deposit row while making direct, partner, and card-preauth
-- custody explicit for future Wafacash/Fatourati/Stripe-style adapters.

DO $$
BEGIN
  CREATE TYPE deposit_handling AS ENUM ('DIRECT', 'PARTNER', 'CARD_PREAUTH');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE deposit_custody AS ENUM ('AGENCY', 'PARTNER', 'EXTERNAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE deposits
  ADD COLUMN IF NOT EXISTS handling deposit_handling NOT NULL DEFAULT 'DIRECT',
  ADD COLUMN IF NOT EXISTS custody deposit_custody NOT NULL DEFAULT 'AGENCY';

-- Existing deposits were agency-held by construction. New rows must keep the
-- custody semantics aligned with the selected handling mode.
ALTER TABLE deposits
  DROP CONSTRAINT IF EXISTS deposits_handling_custody_ck;
ALTER TABLE deposits
  ADD CONSTRAINT deposits_handling_custody_ck CHECK (
    (handling = 'DIRECT' AND custody = 'AGENCY') OR
    (handling = 'PARTNER' AND custody = 'PARTNER') OR
    (handling = 'CARD_PREAUTH' AND custody = 'EXTERNAL')
  );

-- Generic rails for partner/provider-backed deposit records. Values are added
-- here for future API adapters; they are intentionally not hard-coded to a
-- provider name such as WAFACASH, FATOURATI, or STRIPE.
ALTER TYPE deposit_method ADD VALUE IF NOT EXISTS 'PARTNER';
ALTER TYPE deposit_method ADD VALUE IF NOT EXISTS 'PAYMENT_PROVIDER';
