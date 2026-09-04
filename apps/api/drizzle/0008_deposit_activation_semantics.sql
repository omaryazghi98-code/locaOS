-- Deposit activation semantics: the rental may require a deposit, but custody is
-- provider-agnostic. DIRECT deposits are agency-held, PARTNER deposits are held
-- by an external partner, and CARD_PREAUTH deposits are external authorizations.
-- A zero required deposit remains valid and does not require a deposit row.
--
-- This trigger is a database backstop for contract activation. The API should
-- perform the same checks and expose stable application errors, but a direct SQL
-- write must not be able to activate a contract with an insufficient deposit.

create or replace function enforce_contract_activation_deposit_semantics()
returns trigger
language plpgsql
as $$
declare
  required_deposit bigint := 0;
  secured_deposit bigint := 0;
  secured_count integer := 0;
begin
  if new.status = 'ACTIVE' and coalesce(old.status, '') <> 'ACTIVE' then
    if new.reservation_id is not null then
      select coalesce(q.deposit_required, 0)
        into required_deposit
        from reservations r
        left join quotes q on q.id = r.quote_id
       where r.id = new.reservation_id
         and r.agency_id = new.agency_id;
    end if;

    -- No required deposit is a first-class valid path. Do not require a
    -- deposit row merely because the contract has been activated.
    if required_deposit > 0 then
      select coalesce(max(d.amount), 0), count(*)
        into secured_deposit, secured_count
        from deposits d
       where d.agency_id = new.agency_id
         and d.contract_id = new.id
         and d.status in ('HELD', 'PRE_AUTHORIZED');

      if secured_count = 0 or secured_deposit < required_deposit then
        raise exception using
          errcode = 'P0001',
          message = 'DEPOSIT_AMOUNT_INSUFFICIENT',
          detail = format(
            'required_cents=%s secured_cents=%s handling_is_provider_agnostic=true',
            required_deposit,
            secured_deposit
          );
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists contracts_activation_deposit_integrity on contracts;
create trigger contracts_activation_deposit_integrity
before update of status on contracts
for each row execute function enforce_contract_activation_deposit_semantics();
