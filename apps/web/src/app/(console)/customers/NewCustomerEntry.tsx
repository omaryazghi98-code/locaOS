'use client';

import { useRouter } from 'next/navigation';
import NewCustomerForm, { type CreatedCustomer } from '@/components/NewCustomerForm';

export default function NewCustomerEntry() {
  const router = useRouter();
  const onCreated = (_customer: CreatedCustomer) => {
    router.push('/customers');
    router.refresh();
  };
  return <NewCustomerForm onCreated={onCreated} />;
}
