'use client';
import React, { useState } from 'react';
import Image from 'next/image';

interface CompanyInfo {
    name: string;
    address: string;
    city: string;
    phone: string;
    email: string;
    taxId: string;
    logo?: string;
}

interface ClientInfo {
    name: string;
    address: string;
    city: string;
    phone: string;
    email: string;
}

interface InvoiceItem {
    id: number;
    description: string;
    quantity: number;
    price: number;
}

interface InvoiceData {
    invoiceNumber: string;
    date: string;
    dueDate: string;
    company: CompanyInfo;
    client: ClientInfo;
    items: InvoiceItem[];
    taxRate: number;
    bank: BankInfo;
    notes: string;
    paymentTerms?: string;
}

interface BankInfo {
    name: string;
    accountName: string;
    accountNumber: string;
    branch: string;
}

interface InvoiceTemplateProps {
    invoiceData?: Partial<InvoiceData>;
}

const InvoiceTemplateOptimized: React.FC<InvoiceTemplateProps> = ({ invoiceData }) => {
    // Default data
    const defaultData: InvoiceData = {
        invoiceNumber: 'INV-',
        date: '',
        dueDate: '',
        company: {
            name: 'FeedSport Enterprises',
            address: '2 William Pollett Rd, Borrowdale',
            city: 'Harare',
            phone: '(+263) 774 684 534',
            email: 'accounts@feedsport.co.zw',
            taxId: 'TAX-123-456-789',
            logo: '/fav.png'
        },
        client: {
            name: 'Client Name',
            address: 'Client Address',
            city: 'Client City',
            phone: 'Client Phone',
            email: 'client@example.com'
        },
        items: [
            { id: Date.now(), description: '', quantity: 1, price: 0 }
        ],
        bank: {
            name: 'NMB Bank',
            accountName: 'FeedSport Enterprises',
            accountNumber: '0123456789',
            branch: 'Borrowdale Branch'
        },
        taxRate: 0.1,
        notes: 'Thank you for your business! Payment due within 7 days.',
        paymentTerms: 'Payment is due within 7 days. After this time the invoice will be considered overdue.'
    };

    // Stateful invoice data
    const [data, setData] = useState<InvoiceData>(() => ({
        ...defaultData,
        ...invoiceData,
        invoiceNumber: `INV-${new Date().getTime()}`,
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: invoiceData?.items?.length ? (invoiceData.items as InvoiceItem[]) : defaultData.items
    }));

    // Handlers for items
    const handleItemChange = (index: number, field: keyof InvoiceItem, value: string) => {
        setData(prev => {
            const items = [...prev.items];
            const updated = { ...items[index] };
            if (field === 'description') {
                updated.description = value;
            } else if (field === 'quantity') {
                updated.quantity = parseInt(value) || 0;
            } else if (field === 'price') {
                updated.price = parseFloat(value) || 0;
            }
            items[index] = updated;
            return { ...prev, items };
        });
    };

    const addItem = () => {
        setData(prev => ({
            ...prev,
            items: [...prev.items, { id: Date.now(), description: '', quantity: 1, price: 0 }]
        }));
    };

    const removeItem = (index: number) => {
        if (data.items.length > 1) {
            setData(prev => ({
                ...prev,
                items: prev.items.filter((_, i) => i !== index)
            }));
        }
    };

    // Handler for client/billed-to edits
    const handleClientChange = (field: keyof ClientInfo, value: string) => {
        setData(prev => ({
            ...prev,
            client: {
                ...prev.client,
                [field]: value
            }
        }));
    };

    // Handler for tax rate change
    const handleTaxRateChange = (value: string) => {
        const rate = parseFloat(value) || 0;
        setData(prev => ({
            ...prev,
            taxRate: rate / 100 // Convert percentage to decimal
        }));
    };

    // Handler for bank edits
    const handleBankChange = (field: keyof BankInfo, value: string) => {
        setData(prev => ({
            ...prev,
            bank: {
                ...prev.bank,
                [field]: value
            }
        }));
    };

    // Totals
    const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    const tax = subtotal * data.taxRate;
    const total = subtotal + tax;

    // Print handler
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="invoice-container max-w-4xl mx-auto p-6 bg-white font-sans text-gray-800">
            {/* Print-specific styles */}
            <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 1cm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .invoice-container {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          . {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

            {/* Print button */}
            <button
                onClick={handlePrint}
                className="no-print mb-6 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors shadow-md"
            >
                Print Invoice
            </button>

            {/* Invoice Content */}
            <div className="border border-gray-200 rounded-xl p-8 print:border-0 print:shadow-none print:p-0">
                {/* Header Section */}
                <header className="grid grid-cols-2 items-center mb-8 pb-4 border-b border-gray-200">
                    <div className="flex items-center space-x-4">
                        {data.company.logo && (
                            <Image
                                src={data.company.logo}
                                alt={`${data.company.name} logo`}
                                width={80}
                                height={80}
                                className="rounded-full object-cover"
                            />
                        )}
                        <div>
                            <h1 className="text-2xl font-bold print:text-xl">{data.company.name}</h1>
                            <p className="text-sm text-gray-600 print:text-xs">{data.company.address}</p>
                            <p className="text-sm text-gray-600 print:text-xs">{data.company.city}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-4xl font-extrabold text-green-600 print:text-2xl">INVOICE</h2>
                        <div className="mt-2 inline-block bg-green-600 text-white print:bg-green-600/80 p-3 rounded-lg text-sm print:text-xs">
                            <p><span className="font-semibold">#</span> {data.invoiceNumber}</p>
                            <p><span className="font-semibold">Date</span> {data.date}</p>
                            <p><span className="font-semibold">Due</span> {data.dueDate}</p>
                        </div>
                    </div>
                </header>

                {/* Billing & Company Info */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 print:grid-cols-2 print:gap-4 print:mb-6">
                    <div className="border border-gray-200 rounded-lg p-4 print:border-gray-300 print:p-3">
                        <h3 className="font-semibold text-lg mb-2 print:text-base">Bill To</h3>
                        <input
                            type="text"
                            value={data.client.name}
                            onChange={e => handleClientChange('name', e.target.value)}
                            className="w-full text-sm border-b border-gray-200 focus:outline-none focus:border-green-500 mb-2 no-print"
                            placeholder="Client Name"
                        />
                        <div className="hidden print:block text-sm">{data.client.name || 'Client Name'}</div>

                        <input
                            type="text"
                            value={data.client.address}
                            onChange={e => handleClientChange('address', e.target.value)}
                            className="w-full text-sm border-b border-gray-200 focus:outline-none focus:border-green-500 mb-2 no-print"
                            placeholder="Client Address"
                        />
                        <div className="hidden print:block text-sm text-gray-600">{data.client.address || 'Client Address'}</div>

                        <input
                            type="text"
                            value={data.client.city}
                            onChange={e => handleClientChange('city', e.target.value)}
                            className="w-full text-sm border-b border-gray-200 focus:outline-none focus:border-green-500 mb-2 no-print"
                            placeholder="Client City"
                        />
                        <div className="hidden print:block text-sm text-gray-600">{data.client.city || 'Client City'}</div>

                        <input
                            type="text"
                            value={data.client.phone}
                            onChange={e => handleClientChange('phone', e.target.value)}
                            className="w-full text-sm border-b border-gray-200 focus:outline-none focus:border-green-500 mb-2 no-print"
                            placeholder="Client Phone"
                        />
                        <div className="hidden print:block text-sm text-gray-600">Phone: {data.client.phone || 'Client Phone'}</div>

                        <input
                            type="email"
                            value={data.client.email}
                            onChange={e => handleClientChange('email', e.target.value)}
                            className="w-full text-sm border-b border-gray-200 focus:outline-none focus:border-green-500 no-print"
                            placeholder="Client Email"
                        />
                        <div className="hidden print:block text-sm text-gray-600">Email: {data.client.email || 'client@example.com'}</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 print:p-3 ">
                        <h3 className="font-semibold text-lg mb-2 print:text-base">Company Info</h3>
                        <p className="text-sm text-gray-600 print:text-xs">Phone: {data.company.phone}</p>
                        <p className="text-sm text-gray-600 print:text-xs">Email: {data.company.email}</p>
                        <p className="text-sm text-gray-600 print:text-xs">Tax ID: {data.company.taxId}</p>
                    </div>
                </section>

                {/* Editable Items Table */}
                <div className="mb-4 overflow-x-auto print:overflow-visible">
                    <table className="w-full table-auto border-collapse">
                        <thead>
                            <tr className="bg-green-600 text-white ">
                                <th className="px-4 py-3 text-left font-semibold print:px-2 print:py-2">#</th>
                                <th className="px-4 py-3 text-left font-semibold print:px-2 print:py-2">Description</th>
                                <th className="px-4 py-3 text-right font-semibold print:px-2 print:py-2">Qty</th>
                                <th className="px-4 py-3 text-right font-semibold print:px-2 print:py-2">Unit Price</th>
                                <th className="px-4 py-3 text-right font-semibold print:px-2 print:py-2">Amount</th>
                                <th className="px-4 py-3 text-center font-semibold no-print">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.items.map((item, idx) => (
                                <tr
                                    key={item.id}
                                    className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50 '}
                                >
                                    <td className="px-4 py-3 print:px-2 print:py-2">{idx + 1}</td>
                                    <td className="px-4 py-3 print:px-2 print:py-2">
                                        <input
                                            type="text"
                                            value={item.description}
                                            onChange={e => handleItemChange(idx, 'description', e.target.value)}
                                            className="w-full border-b border-gray-200 focus:outline-none focus:border-green-500 text-sm no-print"
                                            placeholder="Item description"
                                        />
                                        <div className="hidden print:block text-sm">{item.description || 'Item description'}</div>
                                    </td>
                                    <td className="px-4 py-3 text-right print:px-2 print:py-2">
                                        <input
                                            type="number"
                                            min="0"
                                            value={item.quantity}
                                            onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                                            className="w-16 text-right border-b border-gray-200 focus:outline-none focus:border-green-500 text-sm no-print"
                                        />
                                        <div className="hidden print:block text-sm">{item.quantity}</div>
                                    </td>
                                    <td className="px-4 py-3 text-right print:px-2 print:py-2">
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={item.price}
                                            onChange={e => handleItemChange(idx, 'price', e.target.value)}
                                            className="w-24 text-right border-b border-gray-200 focus:outline-none focus:border-green-500 text-sm no-print"
                                        />
                                        <div className="hidden print:block text-sm">${item.price.toFixed(2)}</div>
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium print:px-2 print:py-2">
                                        ${(item.quantity * item.price).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-center no-print">
                                        <button
                                            onClick={() => removeItem(idx)}
                                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                                            disabled={data.items.length <= 1}
                                        >
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mb-6 no-print">
                    <button
                        onClick={addItem}
                        className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center gap-1"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        Add Item
                    </button>
                </div>

                {/* Totals */}
                <div className="flex justify-end mb-8">
                    <div className="w-full md:w-1/3 space-y-2 print:w-2/5">
                        <div className="flex justify-between print:text-sm">
                            <span>Subtotal</span>
                            <span className="pr-4 print:pr-2">${subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between print:text-sm">
                            <span className="flex items-center gap-2">
                                <span>Tax</span>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={(data.taxRate * 100).toFixed(1)}
                                    onChange={e => handleTaxRateChange(e.target.value)}
                                    className="w-16 text-right border-b border-gray-200 focus:outline-none focus:border-green-500 text-sm no-print"
                                />
                                <span className="hidden print:block">({(data.taxRate * 100).toFixed(1)}%)</span>
                            </span>
                            <span className="pr-4 print:pr-2">${tax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-lg pt-2 border-t border-gray-300 print:text-base print:pt-1">
                            <span>Total</span>
                            <span className="pr-4 text-green-600 print:pr-2">${total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Payment Info & Notes */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 print:grid-cols-2 print:gap-4 print:mb-6">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 print:p-3 ">
                        <h4 className="font-semibold text-lg mb-2 print:text-base">Payment Information</h4>
                        <p className="text-sm text-gray-600 mb-2 print:text-xs">{data.paymentTerms}</p>
                        <div className="text-sm text-gray-600 space-y-1 print:text-xs">
                            <p className='flex'>
                                <span className="font-medium">Bank:</span>&nbsp;
                                <span className='flex-1 hidden print:block'>{data.bank.name}</span>
                                <input
                                    type="text"
                                    value={data.bank.name}
                                    onChange={e => handleBankChange('name', e.target.value)}
                                    className="flex-1 text-sm border-b border-gray-200 focus:outline-none focus:border-green-500 mb-2 no-print"
                                    placeholder="Bank Name"
                                />
                            </p>
                            <p className='flex'>
                                <span className="font-medium">Account:</span>&nbsp;
                                <span className='flex-1 hidden print:block'>{data.bank.accountName}</span>
                                <input
                                    type="text"
                                    value={data.bank.accountName}
                                    onChange={e => handleBankChange('accountName', e.target.value)}
                                    className="flex-1 text-sm border-b border-gray-200 focus:outline-none focus:border-green-500 mb-2 no-print"
                                    placeholder="Account Name"
                                />
                            </p>
                            <p className='flex'>
                                <span className="font-medium">Account #:</span>&nbsp;
                                <span className='flex-1 hidden print:block'>{data.bank.accountNumber}</span>
                                <input
                                    type="text"
                                    value={data.bank.accountNumber}
                                    onChange={e => handleBankChange('accountNumber', e.target.value)}
                                    className="flex-1 text-sm border-b border-gray-200 focus:outline-none focus:border-green-500 mb-2 no-print"
                                    placeholder="Account Number"
                                />
                            </p>
                            <p className='flex'>
                                <span className="font-medium">Branch:</span>&nbsp;
                                <span className='flex-1 hidden print:block'>{data.bank.branch}</span>
                                <input
                                    type="text"
                                    value={data.bank.branch}
                                    onChange={e => handleBankChange('branch', e.target.value)}
                                    className="flex-1 text-sm border-b border-gray-200 focus:outline-none focus:border-green-500 mb-2 no-print"
                                    placeholder="Branch"
                                />
                            </p>
                        </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 print:p-3 ">
                        <h4 className="font-semibold text-lg mb-2 print:text-base">Notes</h4>
                        <textarea
                            value={data.notes}
                            onChange={e => setData(prev => ({ ...prev, notes: e.target.value }))}
                            className="w-full border border-gray-200 rounded p-2 text-sm focus:outline-none focus:border-green-500 no-print"
                            rows={3}
                        />
                        <div className="hidden print:block text-sm text-gray-600">{data.notes}</div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="text-center text-sm text-gray-500 border-t border-gray-200 pt-4 print:pt-3 print:text-xs print:border-gray-300">
                    <p>Thank you for your business!</p>
                    <p className="mt-1">www.feedsport.co.zw | {data.company.phone} | {data.company.email}</p>
                    <p className="mt-1 font-medium">This is a computer generated invoice and does not require a signature</p>
                </footer>
            </div>
        </div>
    );
};

export default InvoiceTemplateOptimized;
