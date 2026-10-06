'use client';

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { AlertCircle, CalendarClock, Edit, Loader2, Mail, MoreHorizontal, Phone, Plus, Save, Search, Target, Trash2, X } from "lucide-react";
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
import { LEAD_STATUSES, Lead, LeadStatus } from "@/types";
import { deleteLead, saveLead, setLeadStatus, type LeadFormValues } from "@/app/actions";

const LEAD_SOURCES = ['WhatsApp', 'Phone call', 'Website', 'Referral', 'Walk-in', 'Social media', 'Event', 'Other'];

const getStatusClass = (status: LeadStatus) => {
  switch (status) {
    case 'new': return 'bg-blue-900/30 text-blue-400';
    case 'contacted': return 'bg-harvest-500/15 text-harvest-400';
    case 'qualified': return 'bg-purple-900/30 text-purple-400';
    case 'won': return 'bg-green-900/30 text-green-400';
    case 'lost': return 'bg-red-900/30 text-red-400';
    default: return 'bg-ash-700 text-ash-300';
  }
};

const emptyForm: LeadFormValues = {
  name: '',
  company: '',
  phone: '',
  email: '',
  location: '',
  interest: '',
  source: '',
  status: 'new',
  followUpOn: '',
  notes: '',
};

const inputClass = "mt-1 block w-full bg-ash-700 border-ash-600 rounded-md p-2";

const todayIso = () => format(new Date(), 'yyyy-MM-dd');

const isOpenLead = (lead: Lead) => lead.status !== 'won' && lead.status !== 'lost';

const LeadFormModal = ({ lead, isOpen, onClose, onSave }: {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}) => {
  const [form, setForm] = useState<LeadFormValues>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setForm(lead ? {
      name: lead.name,
      company: lead.company,
      phone: lead.phone,
      email: lead.email,
      location: lead.location,
      interest: lead.interest,
      source: lead.source,
      status: lead.status,
      followUpOn: lead.followUpOn || '',
      notes: lead.notes,
    } : emptyForm);
    setServerError(null);
  }, [isOpen, lead]);

  if (!isOpen) return null;

  const set = (field: keyof LeadFormValues) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setServerError(null);
    const result = await saveLead(form, lead?.id);
    setIsSubmitting(false);
    if (result.success) onSave();
    else setServerError(result.error || 'An unknown error occurred on the server.');
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-ash-800 border border-ash-700 rounded-lg w-full max-w-lg flex flex-col max-h-[90vh]">
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
          <div className="p-4 border-b border-ash-700 flex justify-between items-center flex-shrink-0">
            <h3 className="text-lg font-medium text-ash-100">{lead ? 'Edit Lead' : 'Add Lead'}</h3>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-ash-300">Name</label>
                <input id="name" required value={form.name} onChange={set('name')} className={inputClass} />
              </div>
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-ash-300">Company / Farm</label>
                <input id="company" value={form.company} onChange={set('company')} className={inputClass} />
              </div>
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
              <input id="location" value={form.location} onChange={set('location')} className={inputClass} />
            </div>
            <div>
              <label htmlFor="interest" className="block text-sm font-medium text-ash-300">Interested In</label>
              <input id="interest" value={form.interest} onChange={set('interest')} className={inputClass} placeholder="e.g. Broiler premix, 2t soybean meal monthly" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="source" className="block text-sm font-medium text-ash-300">Source</label>
                <select id="source" value={form.source} onChange={set('source')} className={inputClass}>
                  <option value="">—</option>
                  {LEAD_SOURCES.map((source) => <option key={source} value={source}>{source}</option>)}
                  {form.source && !LEAD_SOURCES.includes(form.source) && <option value={form.source}>{form.source}</option>}
                </select>
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-ash-300">Status</label>
                <select id="status" value={form.status} onChange={set('status')} className={`${inputClass} capitalize`}>
                  {LEAD_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="followUpOn" className="block text-sm font-medium text-ash-300">Follow Up</label>
                <input id="followUpOn" type="date" value={form.followUpOn || ''} onChange={set('followUpOn')} className={inputClass} />
              </div>
            </div>
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-ash-300">Notes</label>
              <textarea id="notes" rows={4} value={form.notes} onChange={set('notes')} className={inputClass} placeholder="Conversation history, herd size, pricing discussed..." />
            </div>
          </div>

          <div className="p-4 border-t border-ash-700 flex justify-end space-x-3 flex-shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-ash-600 rounded-lg hover:bg-ash-700">Cancel</button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-harvest-600 hover:bg-harvest-500 text-ash-950 rounded-lg flex items-center space-x-2 disabled:bg-ash-500"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isSubmitting ? 'Saving...' : 'Save Lead'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

type StatusFilter = 'open' | 'all' | LeadStatus;

export const LeadManagement = ({ initialLeads }: { initialLeads: Lead[] }) => {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const today = todayIso();

  useEffect(() => {
    setLeads(initialLeads);
  }, [initialLeads]);

  const counts = useMemo(() => {
    const byStatus = Object.fromEntries(LEAD_STATUSES.map((status) => [status, 0])) as Record<LeadStatus, number>;
    leads.forEach((lead) => { byStatus[lead.status] += 1; });
    return { ...byStatus, open: leads.filter(isOpenLead).length, all: leads.length };
  }, [leads]);

  const overdueCount = leads.filter((lead) => isOpenLead(lead) && lead.followUpOn && lead.followUpOn <= today).length;

  const filteredLeads = useMemo(() => {
    const term = query.trim().toLowerCase();
    return leads
      .filter((lead) => statusFilter === 'all' || (statusFilter === 'open' ? isOpenLead(lead) : lead.status === statusFilter))
      .filter((lead) => !term || [lead.name, lead.company, lead.phone, lead.email, lead.location, lead.interest, lead.source]
        .some((value) => value.toLowerCase().includes(term)))
      // Leads with the soonest follow-up first; those without a date keep newest-first order.
      .sort((a, b) => (a.followUpOn || '9999').localeCompare(b.followUpOn || '9999'));
  }, [leads, query, statusFilter]);

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedLead(null);
  };

  const handleSaveSuccess = () => {
    toast({ title: "Success!", description: `Lead has been ${selectedLead ? 'updated' : 'added'}.` });
    handleModalClose();
    router.refresh();
  };

  const handleEdit = (lead: Lead) => {
    setSelectedLead(lead);
    setIsModalOpen(true);
  };

  const handleStatusChange = async (lead: Lead, status: LeadStatus) => {
    const previous = lead.status;
    setLeads((current) => current.map((item) => item.id === lead.id ? { ...item, status } : item));
    const result = await setLeadStatus(lead.id, status);
    if (result.success) {
      router.refresh();
    } else {
      setLeads((current) => current.map((item) => item.id === lead.id ? { ...item, status: previous } : item));
      toast({ title: "Error", description: result.error, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!leadToDelete) return;
    const result = await deleteLead(leadToDelete.id);
    if (result.success) {
      toast({ title: "Success", description: "Lead has been deleted." });
      router.refresh();
    } else {
      toast({ title: "Error", description: result.error, variant: 'destructive' });
    }
    setLeadToDelete(null);
  };

  const filters: StatusFilter[] = ['open', ...LEAD_STATUSES, 'all'];

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-ash-100 flex items-center gap-2">
              <Target />
              Leads
            </h2>
            {overdueCount > 0 && (
              <p className="text-sm text-red-400 mt-1 flex items-center gap-1.5">
                <CalendarClock className="w-4 h-4" />
                {overdueCount} open {overdueCount === 1 ? 'lead needs' : 'leads need'} a follow-up today or earlier
              </p>
            )}
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-harvest-600 hover:bg-harvest-500 text-ash-950 rounded-lg flex items-center space-x-2 transition-colors self-start">
            <Plus className="w-4 h-4" />
            <span>Add Lead</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-full text-sm capitalize border transition-colors ${
                statusFilter === filter
                  ? 'bg-harvest-500/15 text-harvest-400 border-harvest-500/40'
                  : 'border-ash-700 text-ash-400 hover:text-ash-200 hover:bg-ash-800'
              }`}
            >
              {filter} <span className="text-ash-500 ml-1">{counts[filter]}</span>
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute top-1/2 left-3 -translate-y-1/2 w-5 h-5 text-ash-400" />
          <input
            type="text"
            placeholder="Search by name, company, location, or interest..."
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-ash-400 uppercase tracking-wider">Lead</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-ash-400 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-ash-400 uppercase tracking-wider">Interest</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-ash-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-ash-400 uppercase tracking-wider">Follow Up</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-ash-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ash-700">
                {filteredLeads.map((lead) => {
                  const isDue = isOpenLead(lead) && !!lead.followUpOn && lead.followUpOn <= today;
                  return (
                    <tr key={lead.id} className="hover:bg-ash-700/50 transition-colors">
                      <td className="px-6 py-4 align-top">
                        <button onClick={() => handleEdit(lead)} className="text-sm font-medium text-ash-100 hover:text-harvest-400 text-left">{lead.name}</button>
                        {lead.company && <div className="text-xs text-ash-300 mt-0.5">{lead.company}</div>}
                        <div className="text-xs text-ash-500 mt-1">
                          {[lead.location, lead.source, `Added ${format(parseISO(lead.createdAt), 'd MMM yyyy')}`].filter(Boolean).join(' · ')}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top text-sm text-ash-300 space-y-1">
                        {lead.phone && (
                          <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 hover:text-harvest-400 whitespace-nowrap"><Phone className="w-3.5 h-3.5" />{lead.phone}</a>
                        )}
                        {lead.email && (
                          <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 hover:text-harvest-400"><Mail className="w-3.5 h-3.5" />{lead.email}</a>
                        )}
                      </td>
                      <td className="px-6 py-4 align-top text-sm text-ash-300 max-w-xs">
                        <div>{lead.interest}</div>
                        {lead.notes && <div className="text-xs text-ash-500 mt-1 line-clamp-2" title={lead.notes}>{lead.notes}</div>}
                      </td>
                      <td className="px-6 py-4 align-top whitespace-nowrap">
                        <select
                          value={lead.status}
                          onChange={(event) => handleStatusChange(lead, event.target.value as LeadStatus)}
                          aria-label={`Status for ${lead.name}`}
                          className={`text-xs font-semibold rounded-full capitalize px-2 py-1 border-0 cursor-pointer ${getStatusClass(lead.status)}`}
                        >
                          {LEAD_STATUSES.map((status) => <option key={status} value={status} className="bg-ash-800 text-ash-100">{status}</option>)}
                        </select>
                      </td>
                      <td className={`px-6 py-4 align-top whitespace-nowrap text-sm ${isDue ? 'text-red-400 font-medium' : 'text-ash-400'}`}>
                        {lead.followUpOn ? format(parseISO(lead.followUpOn), 'd MMM yyyy') : '—'}
                      </td>
                      <td className="px-6 py-4 align-top whitespace-nowrap text-right text-sm font-medium">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 rounded-full hover:bg-ash-700">
                              <MoreHorizontal className="w-5 h-5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-ash-800 border-ash-700 text-ash-100">
                            <DropdownMenuItem onClick={() => handleEdit(lead)} className="flex items-center gap-2 cursor-pointer">
                              <Edit className="w-4 h-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setLeadToDelete(lead)} className="flex items-center gap-2 text-red-400 cursor-pointer focus:bg-red-900/50 focus:text-red-300">
                              <Trash2 className="w-4 h-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-ash-400">
                      {leads.length === 0 ? 'No leads yet. Add your first prospect.' : 'No leads match these filters.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <LeadFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleSaveSuccess}
        lead={selectedLead}
      />

      <AlertDialog open={!!leadToDelete} onOpenChange={(open) => !open && setLeadToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this lead?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete
              <span className="font-bold text-ash-100 mx-1">{leadToDelete?.name}</span>.
              Mark them as lost instead to keep the history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-500">
              Yes, delete lead
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
