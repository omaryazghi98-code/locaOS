-- A deposit can be partially charged without losing its original secured amount.
-- Activation therefore checks the secured deposit amount for HELD,
-- PRE_AUTHORIZED, or PARTIALLY_CHARGED deposits.

create or replace function enforce_contract_activation_deposit_semantics()
returns trigger
language plpgsql
as $$
declare
  required_deposit bigint := 0;
  secured_deposit bigint := 0;
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

    if required_deposit > 0 then
      select coalesce(max(d.amount), 0)
        into secured_deposit
        from deposits d
       where d.agency_id = new.agency_id
         and d.contract_id = new.id
         and d.status in ('HELD', 'PRE_AUTHORIZED', 'PARTIALLY_CHARGED');

      if secured_deposit < required_deposit then
        raise exception using
          errcode = 'P0001',
          message = 'DEPOSIT_AMOUNT_INSUFFICIENT',
          detail = format('required_cents=%s secured_cents=%s handling_is_provider_agnostic=true', required_deposit, secured_deposit);
      end if;
    end if;
  end if;

  return new;
end;
$$;

-- Keep the trigger name stable while correcting the status set used by the
-- activation backstop. Zero required deposit remains a valid activation path.
drop trigger if exists contracts_activation_deposit_integrity on contracts;
create trigger contracts_activation_deposit_integrity
before update of status on contracts
for each row execute function enforce_contract_activation_deposit_semantics();
