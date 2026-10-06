
'use client';

import { Invoice, Product } from '@/types';
import { Save, AlertCircle, Trash2, Plus, ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, SubmitHandler, useFieldArray, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateInvoice, createInvoice } from '@/app/actions';
import { useToast } from '../ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import Link from 'next/link';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from '@/lib/utils';
import { formatKg, packLabel } from '@/lib/product-units';


const InvoiceItemSchema = z.object({
    id: z.string(),
    productId: z.string().optional(),
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
  bank: z.object({
    name: z.string(),
    accountName: z.string(),
    accountNumber: z.string(),
    branch: z.string(),
  }),
  status: z.enum(['draft', 'sent', 'paid', 'void']),
  date: z.date({ required_error: "Issue date is required."}),
  dueDate: z.date({ required_error: "Due date is required." }),
  items: z.array(InvoiceItemSchema).min(1, "At least one line item is required."),
  notes: z.string().optional(),
  paymentTerms: z.string().optional(),
  taxRate: z.coerce.number().min(0).max(100),
}).refine((data) => data.dueDate >= data.date, {
  message: 'Due date cannot be before the issue date.',
  path: ['dueDate'],
});

type FormValues = z.infer<typeof InvoiceFormSchema>;

export const InvoiceForm = ({ invoice, products }: { invoice?: Invoice; products: Product[] }) => {
  const router = useRouter();
  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      bank: invoice?.bank || {
        name: '',
        accountName: '',
        accountNumber: '',
        branch: '',
      },
      status: invoice?.status || 'draft',
      date: invoice ? getTimestamp(invoice.date) : new Date(),
      dueDate: invoice ? getTimestamp(invoice.dueDate) : new Date(new Date().setDate(new Date().getDate() + 30)),
      items: invoice?.items.map(item => ({...item, id: item.id || crypto.randomUUID()})) || [
        { id: crypto.randomUUID(), productId: '', description: '', quantity: 1, price: 0 },
      ],
      notes: invoice?.notes || 'Thank you for your business!',
      paymentTerms: invoice?.paymentTerms || 'Payment due within 30 days.',
      taxRate: invoice ? invoice.taxRate * 100 : 15,
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

  const handleProductChange = (index: number, productId: string) => {
    form.setValue(`items.${index}.productId`, productId, { shouldDirty: true });
    const product = products.find(p => p.id === productId);
    if(product) {
        form.setValue(`items.${index}.description`, `${product.ingredient?.name || 'Product'} (${formatKg(product.packSizeKg)})`, { shouldValidate: true, shouldDirty: true });
        form.setValue(`items.${index}.price`, product.price, { shouldValidate: true, shouldDirty: true });
    }
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsSubmitting(true);
    setServerError(null);

    const payload = {
      ...data,
      notes: data.notes || '',
      paymentTerms: data.paymentTerms || '',
      totalAmount,
      taxRate: data.taxRate / 100, // convert percentage to decimal
      date: data.date.toISOString(),
      dueDate: data.dueDate.toISOString(),
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
        <Link href="/admin/invoices" className="flex items-center gap-2 text-ash-400 hover:text-ash-100">
          <ArrowLeft className="w-4 h-4" />
          Back to Invoices
        </Link>
        <div className="flex items-center gap-4">
            {invoice && <span className="text-ash-400">Invoice #{invoice.invoiceNumber}</span>}
             <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-harvest-600 hover:bg-harvest-500 text-ash-950 rounded-lg flex items-center space-x-2 transition-colors disabled:bg-ash-500 disabled:cursor-not-allowed"
            >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4" />}
                <span>{isSubmitting ? 'Saving...' : (invoice ? 'Save Changes' : 'Create Invoice')}</span>
            </button>
        </div>
      </div>
      
      {serverError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{serverError}</AlertDescription></Alert>}

      {products.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No products available</AlertTitle>
          <AlertDescription>Add products to the catalogue before creating an invoice, or use a custom line item.</AlertDescription>
        </Alert>
      )}

      {/* Customer Details */}
      <div className="bg-ash-800/50 border border-ash-700 rounded-lg p-6 space-y-6">
          <h3 className="text-lg font-semibold text-ash-100">Customer Information</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="client.name" className="block text-sm font-medium text-ash-300">Customer Name</label>
                <input {...form.register('client.name')} className="mt-1 block w-full bg-ash-700 border-ash-600 rounded-md p-2"/>
                {form.formState.errors.client?.name && <p className="text-red-500 text-xs mt-1">{form.formState.errors.client.name.message}</p>}
              </div>
              <div>
                <label htmlFor="client.email" className="block text-sm font-medium text-ash-300">Email</label>
                <input {...form.register('client.email')} className="mt-1 block w-full bg-ash-700 border-ash-600 rounded-md p-2"/>
                 {form.formState.errors.client?.email && <p className="text-red-500 text-xs mt-1">{form.formState.errors.client.email.message}</p>}
              </div>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="client.address" className="block text-sm font-medium text-ash-300">Address</label>
                <input {...form.register('client.address')} className="mt-1 block w-full bg-ash-700 border-ash-600 rounded-md p-2"/>
                 {form.formState.errors.client?.address && <p className="text-red-500 text-xs mt-1">{form.formState.errors.client.address.message}</p>}
              </div>
              <div>
                <label htmlFor="client.city" className="block text-sm font-medium text-ash-300">City/Town</label>
                <input {...form.register('client.city')} className="mt-1 block w-full bg-ash-700 border-ash-600 rounded-md p-2"/>
                {form.formState.errors.client?.city && <p className="text-red-500 text-xs mt-1">{form.formState.errors.client.city.message}</p>}
              </div>
           </div>
           <div>
              <label htmlFor="client.phone" className="block text-sm font-medium text-ash-300">Phone</label>
              <input {...form.register('client.phone')} className="mt-1 block w-full bg-ash-700 border-ash-600 rounded-md p-2"/>
              {form.formState.errors.client?.phone && <p className="text-red-500 text-xs mt-1">{form.formState.errors.client.phone.message}</p>}
           </div>
      </div>

       {/* Invoice Details */}
      <div className="bg-ash-800/50 border border-ash-700 rounded-lg p-6 space-y-6">
           <h3 className="text-lg font-semibold text-ash-100">Invoice Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Controller
                control={form.control}
                name="date"
                render={({ field }) => (
                <div>
                    <label className="block text-sm font-medium text-ash-300 mb-1">Issue Date</label>
                    <Popover><PopoverTrigger asChild>
                    <button className={cn("w-full justify-start text-left font-normal bg-ash-700 p-2 rounded-md", !field.value && "text-muted-foreground")}>
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
                    <label className="block text-sm font-medium text-ash-300 mb-1">Due Date</label>
                    <Popover><PopoverTrigger asChild>
                    <button className={cn("w-full justify-start text-left font-normal bg-ash-700 p-2 rounded-md", !field.value && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4 inline"/>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                    </button>
                    </PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover>
                    {form.formState.errors.dueDate && <p className="text-red-500 text-xs mt-1">{form.formState.errors.dueDate.message}</p>}
                </div>
            )}/>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-ash-300">Status</label>
              <select {...form.register('status')} className="mt-1 block w-full bg-ash-700 border-ash-600 rounded-md p-2">
                <option value="draft">Draft</option><option value="sent">Sent</option><option value="paid">Paid</option><option value="void">Void</option>
              </select>
            </div>
          </div>
      </div>
      
      {/* Line Items */}
      <div className="bg-ash-800/50 border border-ash-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-ash-100 mb-4">Line Items</h3>
          <div className="space-y-4">
              {fields.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-1 md:grid-cols-[1.4fr,1.5fr,.65fr,.8fr,auto] gap-4 items-start p-4 bg-ash-900/50 rounded-lg">
                      <div className="w-full">
                        <label className="text-xs text-ash-400">Product</label>
                        <select
                            {...form.register(`items.${index}.productId`)}
                            onChange={(e) => handleProductChange(index, e.target.value)}
                            className="w-full bg-ash-700 border-ash-600 rounded-md p-2 mt-1"
                        >
                            <option value="">Custom item</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.ingredient?.name} — ${p.price.toFixed(2)} / {packLabel(p.packSizeKg)}</option>)}
                        </select>
                        <input type="hidden" {...form.register(`items.${index}.id`)} />
                      </div>
                      <div>
                        <label className="text-xs text-ash-400">Description</label>
                        <input {...form.register(`items.${index}.description`)} className="w-full bg-ash-700 border-ash-600 rounded-md p-2 mt-1" />
                        {form.formState.errors.items?.[index]?.description && <p className="text-red-500 text-xs mt-1">{form.formState.errors.items[index]?.description?.message}</p>}
                      </div>
                      <div>
                        <label className="text-xs text-ash-400">Quantity</label>
                        <input type="number" step="any" {...form.register(`items.${index}.quantity`)} className="w-full bg-ash-700 border-ash-600 rounded-md p-2 mt-1" />
                      </div>
                       <div>
                        <label className="text-xs text-ash-400">Unit Price</label>
                        <input type="number" step="any" {...form.register(`items.${index}.price`)} className="w-full bg-ash-700 border-ash-600 rounded-md p-2 mt-1"/>
                      </div>
                      <div className="self-end">
                        <button type="button" onClick={() => remove(index)} className="p-2 text-red-500 hover:text-red-400 hover:bg-ash-700 rounded-md"><Trash2 className="w-5 h-5"/></button>
                      </div>
                  </div>
              ))}
          </div>
          <button type="button" onClick={() => append({id: crypto.randomUUID(), productId: '', description: '', quantity: 1, price: 0})} className="mt-4 px-3 py-2 text-sm bg-harvest-600 hover:bg-harvest-500 text-ash-950 rounded-lg flex items-center gap-2"><Plus className="w-4 h-4"/> Add Item</button>
          {form.formState.errors.items && <p className="text-red-500 text-xs mt-2">{form.formState.errors.items.message || form.formState.errors.items.root?.message}</p>}
          <div className="mt-6 pt-4 border-t border-ash-700 flex justify-end">
              <div className="text-right w-full max-w-sm space-y-2">
                  <div className="flex justify-between"><span className="text-ash-400">Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between items-center">
                    <span className="text-ash-400">Tax (%)</span>
                    <input type="number" {...form.register('taxRate')} className="w-20 bg-ash-700 border-ash-600 rounded-md p-1 text-right"/>
                  </div>
                  <div className="flex justify-between text-xl font-bold text-ash-100 pt-2 border-t border-ash-600"><span>Total</span><span>${totalAmount.toFixed(2)}</span></div>
              </div>
          </div>
      </div>

       {/* Notes, terms & payment details */}
        <div className="bg-ash-800/50 border border-ash-700 rounded-lg p-6 space-y-6">
            <h3 className="text-lg font-semibold text-ash-100">Notes, Terms & Payment Details</h3>
            <div>
                <label htmlFor="notes" className="block text-sm font-medium text-ash-300">Notes</label>
                <textarea {...form.register('notes')} rows={3} className="mt-1 block w-full bg-ash-700 border-ash-600 rounded-md p-2"/>
            </div>
            <div>
                <label htmlFor="paymentTerms" className="block text-sm font-medium text-ash-300">Payment Terms</label>
                <input {...form.register('paymentTerms')} className="mt-1 block w-full bg-ash-700 border-ash-600 rounded-md p-2"/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-ash-700">
              <div>
                <label className="block text-sm font-medium text-ash-300">Bank</label>
                <input {...form.register('bank.name')} placeholder="Bank name" className="mt-1 block w-full bg-ash-700 border-ash-600 rounded-md p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ash-300">Account Name</label>
                <input {...form.register('bank.accountName')} placeholder="Account holder" className="mt-1 block w-full bg-ash-700 border-ash-600 rounded-md p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ash-300">Account Number</label>
                <input {...form.register('bank.accountNumber')} placeholder="Account number" className="mt-1 block w-full bg-ash-700 border-ash-600 rounded-md p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ash-300">Branch</label>
                <input {...form.register('bank.branch')} placeholder="Branch" className="mt-1 block w-full bg-ash-700 border-ash-600 rounded-md p-2" />
              </div>
            </div>
        </div>
    </form>
  );
};
