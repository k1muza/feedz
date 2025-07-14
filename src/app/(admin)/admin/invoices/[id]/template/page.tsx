
'use client';

import { getInvoiceById } from '@/app/actions';
import { notFound, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Invoice } from '@/types';
import { Loader2 } from 'lucide-react';
import InvoiceTemplateOptimized from '@/components/invoice/InvoiceTemplate';

export default function InvoiceTemplatePage({ params }: { params: { id: string } }) {
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

  if (!invoice) return notFound();

  // Convert server data to the format expected by the template component
  const getTimestamp = (timestamp: any): Date => {
    if (!timestamp) return new Date();
    if (timestamp instanceof Date) return timestamp;
    if (timestamp && typeof timestamp.seconds === 'number') {
      return new Date(timestamp.seconds * 1000);
    }
    if (typeof timestamp === 'string') {
        return new Date(timestamp);
    }
    return new Date();
  };

  const templateData = {
    ...invoice,
    date: getTimestamp(invoice.date).toISOString().split('T')[0],
    dueDate: getTimestamp(invoice.dueDate).toISOString().split('T')[0],
  }

  return (
    <div className="min-h-screen print:mx-0 print:p-0 print:padding-none print:border-none print:bg-white">
      <InvoiceTemplateOptimized invoiceData={templateData} />
    </div>
  );
}
