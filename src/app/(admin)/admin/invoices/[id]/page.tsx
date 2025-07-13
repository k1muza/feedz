
'use client';

import { InvoiceForm } from '@/components/admin/InvoiceForm';
import { getInvoiceById } from '@/app/actions';
import { notFound } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Invoice } from '@/types';
import { Loader2 } from 'lucide-react';

export default function EditInvoicePage({ params }: { params: { id: string } }) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoice = async () => {
        const fetchedInvoice = await getInvoiceById(params.id);
        if (!fetchedInvoice) {
            notFound();
        }
        setInvoice(fetchedInvoice);
        setLoading(false);
    };
    fetchInvoice();
  }, [params.id]);

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin"/> Loading invoice...</div>;
  }

  return (
    <div>
      {invoice && <InvoiceForm invoice={invoice} />}
    </div>
  );
}
