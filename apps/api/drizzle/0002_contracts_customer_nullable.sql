-- Blank-contract stubs (BLANK_ISSUED) have no customer yet — drop NOT NULL on contracts.
-- (reservations.customer_id stays NOT NULL; SET is a no-op guard for already-correct DBs.)
ALTER TABLE "contracts" ALTER COLUMN "customer_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "reservations" ALTER COLUMN "customer_id" SET NOT NULL;
