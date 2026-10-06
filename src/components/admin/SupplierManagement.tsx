'use client';

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Edit, Loader2, Mail, MoreHorizontal, Phone, Plus, Save, Search, Trash2, Truck, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { useToast } from "../ui/use-toast";
import { Supplier } from "@/types";
import { deleteSupplier, saveSupplier, type SupplierFormValues } from "@/app/actions";

const emptyForm: SupplierFormValues = {
  company: '',
  contactName: '',
  phone: '',
  email: '',
  location: '',
  supplies: '',
  notes: '',
  active: true,
};

const inputClass = "mt-1 block w-full bg-ash-700 border-ash-600 rounded-md p-2";

const SupplierFormModal = ({ supplier, isOpen, onClose, onSave }: {
  supplier: Supplier | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}) => {
  const [form, setForm] = useState<SupplierFormValues>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setForm(supplier ? {
      company: supplier.company,
      contactName: supplier.contactName,
      phone: supplier.phone,
      email: supplier.email,
      location: supplier.location,
      supplies: supplier.supplies.join(', '),
      notes: supplier.notes,
      active: supplier.active,
    } : emptyForm);
    setServerError(null);
  }, [isOpen, supplier]);

  if (!isOpen) return null;

  const set = (field: keyof SupplierFormValues) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setServerError(null);
    const result = await saveSupplier(form, supplier?.id);
    setIsSubmitting(false);
    if (result.success) onSave();
    else setServerError(result.error || 'An unknown error occurred on the server.');
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-ash-800 border border-ash-700 rounded-lg w-full max-w-lg flex flex-col max-h-[90vh]">
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
          <div className="p-4 border-b border-ash-700 flex justify-between items-center flex-shrink-0">
            <h3 className="text-lg font-medium text-ash-100">{supplier ? 'Edit Supplier' : 'Add Supplier'}</h3>
            <button type="button" onClick={onClose} className="text-ash-400 hover:text-ash-200">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 flex-grow overflow-y-auto space-y-4">
            {serverError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}

            <div>
              <label htmlFor="company" className="block text-sm font-medium text-ash-300">Company</label>
              <input id="company" required value={form.company} onChange={set('company')} className={inputClass} />
            </div>
            <div>
              <label htmlFor="contactName" className="block text-sm font-medium text-ash-300">Contact Person</label>
              <input id="contactName" value={form.contactName} onChange={set('contactName')} className={inputClass} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-ash-300">Phone / WhatsApp</label>
                <input id="phone" type="tel" value={form.phone} onChange={set('phone')} className={inputClass} />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-ash-300">Email</label>
                <input id="email" type="email" value={form.email} onChange={set('email')} className={inputClass} />
              </div>
            </div>
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-ash-300">Location</label>
              <input id="location" value={form.location} onChange={set('location')} className={inputClass} placeholder="e.g. Harare, Zambia, South Africa" />
            </div>
            <div>
              <label htmlFor="supplies" className="block text-sm font-medium text-ash-300">Supplies</label>
              <input id="supplies" value={form.supplies} onChange={set('supplies')} className={inputClass} placeholder="Comma separated, e.g. Soybean meal, Lysine, DCP" />
            </div>
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-ash-300">Notes</label>
              <textarea id="notes" rows={3} value={form.notes} onChange={set('notes')} className={inputClass} placeholder="Pricing, lead times, terms..." />
            </div>
            <label className="flex items-center gap-2 text-sm text-ash-300">
              <input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} />
              Active supplier
            </label>
          </div>

          <div className="p-4 border-t border-ash-700 flex justify-end space-x-3 flex-shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-ash-600 rounded-lg hover:bg-ash-700">Cancel</button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-harvest-600 hover:bg-harvest-500 text-ash-950 rounded-lg flex items-center space-x-2 disabled:bg-ash-500"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isSubmitting ? 'Saving...' : 'Save Supplier'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const SupplierManagement = ({ initialSuppliers }: { initialSuppliers: Supplier[] }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [query, setQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setSuppliers(initialSuppliers);
  }, [initialSuppliers]);

  const filteredSuppliers = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return suppliers;
    return suppliers.filter((supplier) =>
      [supplier.company, supplier.contactName, supplier.location, supplier.phone, supplier.email, ...supplier.supplies]
        .some((value) => value.toLowerCase().includes(term))
    );
  }, [suppliers, query]);

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedSupplier(null);
  };

  const handleSaveSuccess = () => {
    toast({ title: "Success!", description: `Supplier has been ${selectedSupplier ? 'updated' : 'added'}.` });
    handleModalClose();
    router.refresh();
  };

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!supplierToDelete) return;
    const result = await deleteSupplier(supplierToDelete.id);
    if (result.success) {
      toast({ title: "Success", description: "Supplier has been deleted." });
      router.refresh();
    } else {
      toast({ title: "Error", description: result.error, variant: 'destructive' });
    }
    setSupplierToDelete(null);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-2xl font-bold text-ash-100 flex items-center gap-2">
            <Truck />
            Suppliers
          </h2>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-harvest-600 hover:bg-harvest-500 text-ash-950 rounded-lg flex items-center space-x-2 transition-colors self-start">
            <Plus className="w-4 h-4" />
            <span>Add Supplier</span>
          </button>
        </div>

        <div className="relative">
          <Search className="absolute top-1/2 left-3 -translate-y-1/2 w-5 h-5 text-ash-400" />
          <input
            type="text"
            placeholder="Search by company, contact, location, or product..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-ash-800 border border-ash-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-harvest-500/50"
          />
        </div>

        <div className="bg-ash-800/50 border border-ash-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-ash-700">
              <thead className="bg-ash-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-ash-400 uppercase tracking-wider">Supplier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-ash-400 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-ash-400 uppercase tracking-wider">Supplies</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-ash-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ash-700">
                {filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className={`hover:bg-ash-700/50 transition-colors ${supplier.active ? '' : 'opacity-60'}`}>
                    <td className="px-6 py-4 align-top">
                      <div className="text-sm font-medium text-ash-100 flex items-center gap-2">
                        {supplier.company}
                        {!supplier.active && <span className="px-2 text-xs rounded-full bg-ash-700 text-ash-300">Inactive</span>}
                      </div>
                      {supplier.location && <div className="text-xs text-ash-400 mt-1">{supplier.location}</div>}
                      {supplier.notes && <div className="text-xs text-ash-500 mt-1 max-w-xs line-clamp-2" title={supplier.notes}>{supplier.notes}</div>}
                    </td>
                    <td className="px-6 py-4 align-top text-sm text-ash-300 space-y-1">
                      {supplier.contactName && <div className="text-ash-100">{supplier.contactName}</div>}
                      {supplier.phone && (
                        <a href={`tel:${supplier.phone}`} className="flex items-center gap-1.5 hover:text-harvest-400"><Phone className="w-3.5 h-3.5" />{supplier.phone}</a>
                      )}
                      {supplier.email && (
                        <a href={`mailto:${supplier.email}`} className="flex items-center gap-1.5 hover:text-harvest-400"><Mail className="w-3.5 h-3.5" />{supplier.email}</a>
                      )}
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex flex-wrap gap-1 max-w-sm">
                        {supplier.supplies.map((item) => (
                          <span key={item} className="px-2 py-0.5 text-xs rounded-full bg-harvest-500/15 text-harvest-400">{item}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top whitespace-nowrap text-right text-sm font-medium">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-2 rounded-full hover:bg-ash-700">
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-ash-800 border-ash-700 text-ash-100">
                          <DropdownMenuItem onClick={() => handleEdit(supplier)} className="flex items-center gap-2 cursor-pointer">
                            <Edit className="w-4 h-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setSupplierToDelete(supplier)} className="flex items-center gap-2 text-red-400 cursor-pointer focus:bg-red-900/50 focus:text-red-300">
                            <Trash2 className="w-4 h-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
                {filteredSuppliers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-sm text-ash-400">
                      {suppliers.length === 0 ? 'No suppliers yet. Add your first supply contact.' : 'No suppliers match your search.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <SupplierFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleSaveSuccess}
        supplier={selectedSupplier}
      />

      <AlertDialog open={!!supplierToDelete} onOpenChange={(open) => !open && setSupplierToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this supplier?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete
              <span className="font-bold text-ash-100 mx-1">{supplierToDelete?.company}</span>.
              Mark them inactive instead if you may use them again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-500">
              Yes, delete supplier
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
