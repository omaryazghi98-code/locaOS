-- Deposit integrity hardening: make the rental lifecycle invariants authoritative at the database boundary.
-- This complements the API checks so direct writes cannot bypass secured-deposit or charge limits.

create or replace function enforce_contract_activation_deposit()
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
          detail = format('required_cents=%s secured_cents=%s', required_deposit, secured_deposit);
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists contracts_activation_deposit_integrity on contracts;
create trigger contracts_activation_deposit_integrity
before update of status on contracts
for each row execute function enforce_contract_activation_deposit();

create or replace function enforce_deposit_charge_limit()
returns trigger
language plpgsql
as $$
declare
  deposit_amount bigint;
  already_charged bigint := 0;
begin
  select d.amount
    into deposit_amount
    from deposits d
   where d.id = new.deposit_id
     and d.agency_id = new.agency_id
   for update;

  if deposit_amount is null then
    raise exception using errcode = 'P0001', message = 'DEPOSIT_NOT_FOUND';
  end if;

  select coalesce(sum(dc.amount), 0)
    into already_charged
    from deposit_charges dc
   where dc.deposit_id = new.deposit_id;

  if new.amount <= 0 or already_charged + new.amount > deposit_amount then
    raise exception using
      errcode = 'P0001',
      message = 'DEPOSIT_CHARGE_EXCEEDS_REMAINING',
      detail = format('deposit_cents=%s already_charged_cents=%s requested_cents=%s', deposit_amount, already_charged, new.amount);
  end if;

  return new;
end;
$$;

drop trigger if exists deposit_charge_limit_integrity on deposit_charges;
create trigger deposit_charge_limit_integrity
before insert on deposit_charges
for each row execute function enforce_deposit_charge_limit();
