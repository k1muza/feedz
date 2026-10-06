
'use client';

import { PolicyForm } from '@/components/admin/PolicyForm';
import { getPolicyById } from '@/app/actions';
import { notFound, useParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { Policy } from '@/types';
import { Loader2 } from 'lucide-react';

export default function EditPolicyPage() {
  const params = useParams<{ id: string }>();
  const { id } = params;
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPolicy() {
      const fetchedPolicy = await getPolicyById(id);
      if (!fetchedPolicy) {
        notFound();
      }
      setPolicy(fetchedPolicy);
      setLoading(false);
    }
    fetchPolicy();
  }, [id]);

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin"/> Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-ash-100 mb-6">Edit Policy</h1>
      {policy && <PolicyForm policy={policy} />}
    </div>
  );
}
