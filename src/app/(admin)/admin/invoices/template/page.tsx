'use client';
import InvoiceTemplateOptimized from '@/components/invoice/InvoiceTemplate';

const InvoicePage = () => {
  const invoiceData = {
    client: {
      name: 'Sports Club International',
      address: '456 Athletic Blvd',
      city: 'Gym City, GC 67890',
      phone: '(987) 654-3210',
      email: 'accounting@sportsclub.com'
    },
    items: [
      { id: 1, description: 'Sunflower Cake', quantity: 20, price: 35.99 },
      { id: 2, description: 'Soya meal', quantity: 5, price: 24.50 },
      { id: 3, description: 'Calcium carbonate (38%Ca)', quantity: 30, price: 45.00 }
    ],
    taxRate: 0.1,
    notes: 'Please make payment within 7 days. We deliver orders of 2 tonnes 20km radius around Harare.',
  };

  return (
    <div className="min-h-screen print:mx-0 print:p-0 print:padding-none print:border-none print:bg-white">
      <InvoiceTemplateOptimized invoiceData={invoiceData} />
    </div>
  );
};

export default InvoicePage;
