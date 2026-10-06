
'use client';

import { Plus, MoreHorizontal, Search, Edit, Trash2, Receipt, Eye, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { Invoice } from "@/types";
import { useState, useEffect } from "react";
import { deleteInvoice } from "@/app/actions";
import { useRouter } from "next/navigation";
import { useToast } from "../ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";

const getStatusClass = (status: Invoice['status']) => {
  switch (status) {
    case 'paid': return 'bg-green-900/30 text-green-400';
    case 'sent': return 'bg-blue-900/30 text-blue-400';
    case 'draft': return 'bg-ash-700 text-ash-300';
    case 'void': return 'bg-red-900/30 text-red-400';
    default: return 'bg-ash-700 text-ash-300';
  }
};

export const InvoicesManagement = ({ initialInvoices }: { initialInvoices: Invoice[] }) => {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [loading, setLoading] = useState(true);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setInvoices(initialInvoices);
    setLoading(false);
  }, [initialInvoices]);

  const confirmDelete = (invoice: Invoice) => {
    setInvoiceToDelete(invoice);
    setIsAlertOpen(true);
  };

  const handleDelete = async () => {
    if (!invoiceToDelete) return;

    const result = await deleteInvoice(invoiceToDelete.id);

    if (result.success) {
      toast({
        title: "Invoice Deleted",
        description: `Successfully deleted invoice ${invoiceToDelete.invoiceNumber}.`,
      });
      router.refresh();
    } else {
      toast({
        title: "Deletion Failed",
        description: result.error,
        variant: 'destructive',
      });
    }
    setIsAlertOpen(false);
    setInvoiceToDelete(null);
  };
  
  const getTimestamp = (timestamp: any): Date => {
    if (timestamp && typeof timestamp.seconds === 'number') {
      return new Date(timestamp.seconds * 1000);
    }
    if (typeof timestamp === 'string') {
        return new Date(timestamp);
    }
    return new Date();
  };

  const normalizedQuery = query.trim().toLowerCase();
  const filteredInvoices = invoices.filter((invoice) => !normalizedQuery || [
    invoice.invoiceNumber,
    invoice.client.name,
    invoice.client.email,
    invoice.status,
  ].some((value) => value.toLowerCase().includes(normalizedQuery)));

  if (loading) {
    return <div className="text-center p-8"><Loader2 className="w-6 h-6 animate-spin inline-block"/> Loading invoices...</div>
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-2xl font-bold text-ash-100 flex items-center gap-2">
            <Receipt />
            Invoices
          </h2>
          <div className="flex space-x-3">
            <Link href="/admin/invoices/create">
              <button className="px-4 py-2 bg-harvest-600 hover:bg-harvest-500 text-ash-950 rounded-lg flex items-center space-x-2 transition-colors">
                <Plus className="w-4 h-4" />
                <span>Create Invoice</span>
              </button>
            </Link>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 -translate-y-1/2 w-5 h-5 text-ash-400" />
            <input
              type="text"
              placeholder="Search by invoice #, customer name, or status..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-ash-800 border border-ash-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-harvest-500/50"
            />
          </div>
        </div>

        <div className="bg-ash-800/50 border border-ash-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-ash-700">
              <thead className="bg-ash-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-ash-400 uppercase tracking-wider">Invoice #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-ash-400 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-ash-400 uppercase tracking-wider">Issue Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-ash-400 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-ash-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-ash-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ash-700">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-ash-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-ash-100">{invoice.invoiceNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-ash-300">{invoice.client.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-ash-400">{format(getTimestamp(invoice.date), "PPP")}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-ash-100">${invoice.totalAmount.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${getStatusClass(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-2 rounded-full hover:bg-ash-700">
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-ash-800 border-ash-700 text-ash-100">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/invoices/${invoice.id}/template`} className="flex items-center gap-2 cursor-pointer">
                              <Eye className="w-4 h-4" /> View
                            </Link>
                          </DropdownMenuItem>
                           <DropdownMenuItem asChild>
                            <Link href={`/admin/invoices/${invoice.id}`} className="flex items-center gap-2 cursor-pointer">
                              <Edit className="w-4 h-4" /> Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => confirmDelete(invoice)} className="flex items-center gap-2 text-red-400 cursor-pointer focus:bg-red-900/50 focus:text-red-300">
                            <Trash2 className="w-4 h-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-ash-400">
                      {invoices.length === 0 ? 'No invoices yet. Create the first invoice to get started.' : 'No invoices match your search.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete invoice 
              <code className="font-mono bg-ash-700 rounded-sm px-1 mx-1">{invoiceToDelete?.invoiceNumber}</code>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-500">
              Yes, delete invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
