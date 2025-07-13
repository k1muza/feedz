
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
    productId: z.string().min(1, 'Product is required'),
    productName: z.string(),
    quantity: z.coerce.number().min(0.01, 'Quantity must be positive'),
    unitPrice: z.coerce.number().min(0),
    totalPrice: z.coerce.number().min(0),
});

const InvoiceFormSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email("Invalid email address"),
  status: z.enum(['draft', 'sent', 'paid', 'void']),
  issueDate: z.date({ required_error: "Issue date is required."}),
  dueDate: z.date({ required_error: "Due date is required." }),
  items: z.array(InvoiceItemSchema).min(1, "At least one line item is required."),
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
      customerName: invoice?.customerName || '',
      customerEmail: invoice?.customerEmail || '',
      status: invoice?.status || 'draft',
      issueDate: invoice ? getTimestamp(invoice.issueDate) : new Date(),
      dueDate: invoice ? getTimestamp(invoice.dueDate) : new Date(new Date().setDate(new Date().getDate() + 30)),
      items: invoice?.items || [],
    }
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const totalAmount = form.watch('items').reduce((acc, item) => acc + (item.totalPrice || 0), 0);

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
        const quantity = form.getValues(`items.${index}.quantity`) || 1;
        update(index, {
            ...form.getValues(`items.${index}`),
            productId: product.id,
            productName: product.ingredient?.name || 'N/A',
            unitPrice: product.price,
            totalPrice: product.price * quantity,
        });
    }
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const item = form.getValues(`items.${index}`);
    if(item) {
        update(index, {
            ...item,
            quantity,
            totalPrice: item.unitPrice * quantity,
        });
    }
  }

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsSubmitting(true);
    setServerError(null);

    const payload = {
      ...data,
      totalAmount,
      issueDate: Timestamp.fromDate(data.issueDate),
      dueDate: Timestamp.fromDate(data.dueDate),
      customerId: invoice?.customerId || 'temp-customer-id', // Use existing or placeholder
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

      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="customerName" className="block text-sm font-medium text-gray-300">Customer Name</label>
              <input {...form.register('customerName')} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2"/>
              {form.formState.errors.customerName && <p className="text-red-500 text-xs mt-1">{form.formState.errors.customerName.message}</p>}
            </div>
             <div>
              <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-300">Customer Email</label>
              <input {...form.register('customerEmail')} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2"/>
              {form.formState.errors.customerEmail && <p className="text-red-500 text-xs mt-1">{form.formState.errors.customerEmail.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Controller
                control={form.control}
                name="issueDate"
                render={({ field }) => (
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Issue Date</label>
                    <Popover><PopoverTrigger asChild>
                    <button className={cn("w-full justify-start text-left font-normal bg-gray-700 p-2 rounded-md", !field.value && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4 inline"/>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                    </button>
                    </PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover>
                    {form.formState.errors.issueDate && <p className="text-red-500 text-xs mt-1">{form.formState.errors.issueDate.message}</p>}
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
      
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Line Items</h3>
          <div className="space-y-4">
              {fields.map((item, index) => (
                  <div key={item.id} className="flex flex-col md:flex-row items-start gap-4 p-4 bg-gray-900/50 rounded-lg">
                      <div className="flex-1 w-full md:w-auto">
                        <select
                            {...form.register(`items.${index}.productId`)}
                            onChange={(e) => handleProductChange(index, e.target.value)}
                            className="w-full bg-gray-700 border-gray-600 rounded-md p-2"
                        >
                            <option value="">Select a product</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.ingredient?.name}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-3 gap-4 w-full md:w-auto">
                        <input type="number" step="any" placeholder="Qty" {...form.register(`items.${index}.quantity`)} onChange={(e) => handleQuantityChange(index, Number(e.target.value))} className="w-full bg-gray-700 border-gray-600 rounded-md p-2" />
                        <input type="number" step="any" placeholder="Unit Price" {...form.register(`items.${index}.unitPrice`)} className="w-full bg-gray-700 border-gray-600 rounded-md p-2" disabled/>
                        <input type="number" step="any" placeholder="Total" {...form.register(`items.${index}.totalPrice`)} className="w-full bg-gray-700 border-gray-600 rounded-md p-2" disabled/>
                      </div>
                      <button type="button" onClick={() => remove(index)} className="p-2 text-red-500 hover:text-red-400 hover:bg-gray-700 rounded-md"><Trash2 className="w-5 h-5"/></button>
                  </div>
              ))}
          </div>
          <button type="button" onClick={() => append({productId: '', productName: '', quantity: 1, unitPrice: 0, totalPrice: 0})} className="mt-4 px-3 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-2"><Plus className="w-4 h-4"/> Add Item</button>
          {form.formState.errors.items && <p className="text-red-500 text-xs mt-2">{form.formState.errors.items.message || form.formState.errors.items.root?.message}</p>}
          <div className="mt-6 pt-4 border-t border-gray-700 flex justify-end">
              <div className="text-right">
                  <p className="text-gray-400">Total Amount</p>
                  <p className="text-2xl font-bold text-white">${totalAmount.toFixed(2)}</p>
              </div>
          </div>
      </div>
    </form>
  );
};
