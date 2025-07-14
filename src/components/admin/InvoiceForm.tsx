
'use client';

import { Invoice, InvoiceItem, Product } from '@/types';
import { Save, AlertCircle, Trash2, Plus, ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useForm, SubmitHandler, useFieldArray, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateInvoice, createInvoice, getAllProducts } from '@/app/actions';
import { useToast } from '../ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import Link from 'next/link';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from '@/lib/utils';
import { Timestamp } from 'firebase/firestore';


const InvoiceItemSchema = z.object({
    id: z.string(),
    description: z.string().min(1, 'Description is required'),
    quantity: z.coerce.number().min(0.01, 'Quantity must be positive'),
    price: z.coerce.number().min(0),
});

const InvoiceFormSchema = z.object({
  client: z.object({
    name: z.string().min(1, "Customer name is required"),
    email: z.string().email("Invalid email address"),
    address: z.string().min(1, "Address is required"),
    city: z.string().min(1, "City is required"),
    phone: z.string().min(1, "Phone is required"),
  }),
  status: z.enum(['draft', 'sent', 'paid', 'void']),
  date: z.date({ required_error: "Issue date is required."}),
  dueDate: z.date({ required_error: "Due date is required." }),
  items: z.array(InvoiceItemSchema).min(1, "At least one line item is required."),
  notes: z.string().optional(),
  paymentTerms: z.string().optional(),
  taxRate: z.coerce.number().min(0).max(100),
});

type FormValues = z.infer<typeof InvoiceFormSchema>;

export const InvoiceForm = ({ invoice }: { invoice?: Invoice }) => {
  const router = useRouter();
  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

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

  const form = useForm<FormValues>({
    resolver: zodResolver(InvoiceFormSchema),
    defaultValues: {
      client: {
          name: invoice?.client.name || '',
          email: invoice?.client.email || '',
          address: invoice?.client.address || '',
          city: invoice?.client.city || '',
          phone: invoice?.client.phone || '',
      },
      status: invoice?.status || 'draft',
      date: invoice ? getTimestamp(invoice.date) : new Date(),
      dueDate: invoice ? getTimestamp(invoice.dueDate) : new Date(new Date().setDate(new Date().getDate() + 30)),
      items: invoice?.items.map(item => ({...item, id: item.id || crypto.randomUUID()})) || [],
      notes: invoice?.notes || 'Thank you for your business!',
      paymentTerms: invoice?.paymentTerms || 'Payment due within 30 days.',
      taxRate: invoice?.taxRate ? invoice.taxRate * 100 : 15,
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const watchedItems = form.watch('items');
  const taxRate = form.watch('taxRate') / 100;

  const subtotal = watchedItems.reduce((acc, item) => acc + ((item.quantity || 0) * (item.price || 0)), 0);
  const totalAmount = subtotal * (1 + taxRate);

  useEffect(() => {
    const fetchProducts = async () => {
      const allProducts = await getAllProducts();
      setProducts(allProducts);
    }
    fetchProducts();
  }, []);

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if(product) {
        form.setValue(`items.${index}.description`, product.ingredient?.name || 'N/A');
        form.setValue(`items.${index}.price`, product.price);
    }
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsSubmitting(true);
    setServerError(null);

    const payload = {
      ...data,
      totalAmount,
      taxRate: data.taxRate / 100, // convert percentage to decimal
      date: Timestamp.fromDate(data.date),
      dueDate: Timestamp.fromDate(data.dueDate),
      bank: invoice?.bank || { // Use existing or default
          name: 'NMB Bank',
          accountName: 'FeedSport Enterprises',
          accountNumber: '0123456789',
          branch: 'Borrowdale Branch'
      },
    };

    let result;
    if (invoice) {
        result = await updateInvoice(invoice.id, payload);
    } else {
        result = await createInvoice(payload);
    }
    
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: 'Success!',
        description: `Invoice ${invoice ? 'updated' : 'created'} successfully.`,
      });
      router.push('/admin/invoices');
      router.refresh();
    } else {
      setServerError(result.error || 'An unknown error occurred.');
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex justify-between items-center">
        <Link href="/admin/invoices" className="flex items-center gap-2 text-gray-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" />
          Back to Invoices
        </Link>
        <div className="flex items-center gap-4">
            {invoice && <span className="text-gray-400">Invoice #{invoice.invoiceNumber}</span>}
             <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center space-x-2 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4" />}
                <span>{isSubmitting ? 'Saving...' : (invoice ? 'Save Changes' : 'Create Invoice')}</span>
            </button>
        </div>
      </div>
      
      {serverError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{serverError}</AlertDescription></Alert>}

      {/* Customer Details */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-6">
          <h3 className="text-lg font-semibold text-white">Customer Information</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="client.name" className="block text-sm font-medium text-gray-300">Customer Name</label>
                <input {...form.register('client.name')} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2"/>
                {form.formState.errors.client?.name && <p className="text-red-500 text-xs mt-1">{form.formState.errors.client.name.message}</p>}
              </div>
              <div>
                <label htmlFor="client.email" className="block text-sm font-medium text-gray-300">Email</label>
                <input {...form.register('client.email')} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2"/>
                 {form.formState.errors.client?.email && <p className="text-red-500 text-xs mt-1">{form.formState.errors.client.email.message}</p>}
              </div>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="client.address" className="block text-sm font-medium text-gray-300">Address</label>
                <input {...form.register('client.address')} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2"/>
                 {form.formState.errors.client?.address && <p className="text-red-500 text-xs mt-1">{form.formState.errors.client.address.message}</p>}
              </div>
              <div>
                <label htmlFor="client.city" className="block text-sm font-medium text-gray-300">City/Town</label>
                <input {...form.register('client.city')} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2"/>
                {form.formState.errors.client?.city && <p className="text-red-500 text-xs mt-1">{form.formState.errors.client.city.message}</p>}
              </div>
           </div>
           <div>
              <label htmlFor="client.phone" className="block text-sm font-medium text-gray-300">Phone</label>
              <input {...form.register('client.phone')} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2"/>
              {form.formState.errors.client?.phone && <p className="text-red-500 text-xs mt-1">{form.formState.errors.client.phone.message}</p>}
           </div>
      </div>

       {/* Invoice Details */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-6">
           <h3 className="text-lg font-semibold text-white">Invoice Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Controller
                control={form.control}
                name="date"
                render={({ field }) => (
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Issue Date</label>
                    <Popover><PopoverTrigger asChild>
                    <button className={cn("w-full justify-start text-left font-normal bg-gray-700 p-2 rounded-md", !field.value && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4 inline"/>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                    </button>
                    </PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover>
                    {form.formState.errors.date && <p className="text-red-500 text-xs mt-1">{form.formState.errors.date.message}</p>}
                </div>
            )}/>
            <Controller
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Due Date</label>
                    <Popover><PopoverTrigger asChild>
                    <button className={cn("w-full justify-start text-left font-normal bg-gray-700 p-2 rounded-md", !field.value && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4 inline"/>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                    </button>
                    </PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover>
                    {form.formState.errors.dueDate && <p className="text-red-500 text-xs mt-1">{form.formState.errors.dueDate.message}</p>}
                </div>
            )}/>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-300">Status</label>
              <select {...form.register('status')} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2">
                <option value="draft">Draft</option><option value="sent">Sent</option><option value="paid">Paid</option><option value="void">Void</option>
              </select>
            </div>
          </div>
      </div>
      
      {/* Line Items */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Line Items</h3>
          <div className="space-y-4">
              {fields.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-1 md:grid-cols-[2fr,1fr,1fr,auto] gap-4 items-start p-4 bg-gray-900/50 rounded-lg">
                      <div className="w-full">
                        <label className="text-xs text-gray-400">Product</label>
                        <select
                            onChange={(e) => handleProductChange(index, e.target.value)}
                            className="w-full bg-gray-700 border-gray-600 rounded-md p-2 mt-1"
                        >
                            <option value="">Select a product</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.ingredient?.name}</option>)}
                        </select>
                        <input type="hidden" {...form.register(`items.${index}.id`)} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Quantity</label>
                        <input type="number" step="any" {...form.register(`items.${index}.quantity`)} className="w-full bg-gray-700 border-gray-600 rounded-md p-2 mt-1" />
                      </div>
                       <div>
                        <label className="text-xs text-gray-400">Unit Price</label>
                        <input type="number" step="any" {...form.register(`items.${index}.price`)} className="w-full bg-gray-700 border-gray-600 rounded-md p-2 mt-1"/>
                      </div>
                      <div className="self-end">
                        <button type="button" onClick={() => remove(index)} className="p-2 text-red-500 hover:text-red-400 hover:bg-gray-700 rounded-md"><Trash2 className="w-5 h-5"/></button>
                      </div>
                  </div>
              ))}
          </div>
          <button type="button" onClick={() => append({id: crypto.randomUUID(), description: '', quantity: 1, price: 0})} className="mt-4 px-3 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-2"><Plus className="w-4 h-4"/> Add Item</button>
          {form.formState.errors.items && <p className="text-red-500 text-xs mt-2">{form.formState.errors.items.message || form.formState.errors.items.root?.message}</p>}
          <div className="mt-6 pt-4 border-t border-gray-700 flex justify-end">
              <div className="text-right w-full max-w-sm space-y-2">
                  <div className="flex justify-between"><span className="text-gray-400">Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Tax (%)</span>
                    <input type="number" {...form.register('taxRate')} className="w-20 bg-gray-700 border-gray-600 rounded-md p-1 text-right"/>
                  </div>
                  <div className="flex justify-between text-xl font-bold text-white pt-2 border-t border-gray-600"><span>Total</span><span>${totalAmount.toFixed(2)}</span></div>
              </div>
          </div>
      </div>

       {/* Notes & Terms */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-6">
            <h3 className="text-lg font-semibold text-white">Notes & Payment Terms</h3>
            <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-300">Notes</label>
                <textarea {...form.register('notes')} rows={3} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2"/>
            </div>
            <div>
                <label htmlFor="paymentTerms" className="block text-sm font-medium text-gray-300">Payment Terms</label>
                <input {...form.register('paymentTerms')} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2"/>
            </div>
        </div>
    </form>
  );
};
