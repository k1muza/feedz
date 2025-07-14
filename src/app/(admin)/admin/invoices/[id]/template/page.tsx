
'use client';

import { getInvoiceById } from '@/app/actions';
import { notFound, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { Invoice } from '@/types';
import { ArrowLeft, Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { useReactToPrint } from 'react-to-print';
import { FaWheatAwn } from 'react-icons/fa6';
import { format } from 'date-fns';

export default function InvoiceTemplatePage({ params }: { params: { id: string } }) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const componentRef = useRef(null);
  const router = useRouter();

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });
  
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

  return (
    <div className="bg-gray-900 min-h-full p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                 <Button asChild variant="outline">
                    <Link href="/admin/invoices" className="flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Invoices
                    </Link>
                </Button>
                <Button onClick={handlePrint} className="flex items-center gap-2">
                    <Printer className="w-4 h-4" />
                    Print Invoice
                </Button>
            </div>
            
            <div ref={componentRef} className="bg-white text-gray-800 p-8 sm:p-12 rounded-lg shadow-2xl printable-area">
                <header className="flex justify-between items-start pb-6 border-b-2 border-gray-200">
                    <div>
                        <div className="flex items-center mb-4">
                            <FaWheatAwn className="text-green-600 text-3xl mr-3" />
                            <span className="text-2xl font-bold text-gray-900">FeedSport</span>
                        </div>
                        <address className="text-sm text-gray-600 not-italic">
                            2 Off William Pollet Drive<br/>
                            Borrowdale, Harare<br/>
                            Zimbabwe
                        </address>
                    </div>
                    <div className="text-right">
                        <h1 className="text-4xl font-bold uppercase text-gray-400">Invoice</h1>
                        <p className="text-sm mt-2">
                            <span className="font-semibold text-gray-600">Invoice #: </span>
                            {invoice.invoiceNumber}
                        </p>
                        <p className="text-sm">
                            <span className="font-semibold text-gray-600">Date Issued: </span>
                             {format(getTimestamp(invoice.issueDate), "PPP")}
                        </p>
                    </div>
                </header>

                <section className="grid grid-cols-2 gap-8 my-8">
                    <div>
                        <h2 className="text-sm font-semibold uppercase text-gray-500 mb-2">Bill To</h2>
                        <p className="font-bold text-lg text-gray-900">{invoice.customerName}</p>
                        <p className="text-sm text-gray-600">{invoice.customerEmail}</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-sm font-semibold uppercase text-gray-500 mb-2">Due Date</h2>
                        <p className="font-bold text-lg text-gray-900">{format(getTimestamp(invoice.dueDate), "PPP")}</p>
                    </div>
                </section>
                
                <section>
                    <table className="w-full text-left">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-3 text-sm font-semibold uppercase text-gray-600">Item</th>
                                <th className="p-3 text-sm font-semibold uppercase text-gray-600 text-center">Quantity</th>
                                <th className="p-3 text-sm font-semibold uppercase text-gray-600 text-right">Unit Price</th>
                                <th className="p-3 text-sm font-semibold uppercase text-gray-600 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.items.map((item, index) => (
                                <tr key={index} className="border-b border-gray-100">
                                    <td className="p-3 font-medium text-gray-800">{item.productName}</td>
                                    <td className="p-3 text-gray-600 text-center">{item.quantity}</td>
                                    <td className="p-3 text-gray-600 text-right">${item.unitPrice.toFixed(2)}</td>
                                    <td className="p-3 font-semibold text-gray-800 text-right">${item.totalPrice.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>

                <section className="flex justify-end mt-8">
                    <div className="w-full max-w-xs space-y-2">
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>Subtotal</span>
                            <span>${invoice.totalAmount.toFixed(2)}</span>
                        </div>
                         <div className="flex justify-between text-sm text-gray-600">
                            <span>Tax (0%)</span>
                            <span>$0.00</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-gray-200">
                            <span className="font-bold text-lg text-gray-900">Total</span>
                            <span className="font-bold text-lg text-gray-900">${invoice.totalAmount.toFixed(2)}</span>
                        </div>
                    </div>
                </section>

                <footer className="mt-12 pt-6 border-t-2 border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Thank you!</h3>
                    <p className="text-sm text-gray-600">
                        Payment is due within 30 days. Please include the invoice number on your payment.
                    </p>
                </footer>
            </div>
        </div>
         <style jsx global>{`
            @media print {
                body {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .no-print {
                    display: none;
                }
                .printable-area {
                    box-shadow: none !important;
                    border: none !important;
                    border-radius: 0 !important;
                    padding: 0 !important;
                }
            }
        `}</style>
    </div>
  );
}
