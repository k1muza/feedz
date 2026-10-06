

'use client';

import { useState } from 'react';
import { ContactInquiry } from '@/types';
import { markInquiryRead } from '@/app/actions';
import { format, formatDistanceToNow } from 'date-fns';
import { Mail, Calendar, User, Phone } from 'lucide-react';

export const InquiryManagement = ({ initialInquiries }: { initialInquiries: ContactInquiry[] }) => {
  const [inquiries, setInquiries] = useState<ContactInquiry[]>(initialInquiries);
  const [selectedInquiry, setSelectedInquiry] = useState<ContactInquiry | null>(null);

  const openInquiry = (inquiry: ContactInquiry) => {
    setSelectedInquiry(inquiry);
    if (!inquiry.read) {
      setInquiries((items) => items.map((item) => (item.id === inquiry.id ? { ...item, read: true } : item)));
      markInquiryRead(inquiry.id);
    }
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

  return (
    <div className="flex h-[calc(100vh-150px)] bg-ash-800/50 border border-ash-700 rounded-lg overflow-hidden">
      {/* Sidebar with inquiries list */}
      <div className="w-1/3 border-r border-ash-700 flex flex-col">
        <div className="p-4 border-b border-ash-700">
          <h2 className="text-xl font-bold text-ash-100 flex items-center gap-2"><Mail/> Inquiries <span className="text-sm font-normal text-ash-400">{inquiries.filter((item) => !item.read).length} unread</span></h2>
        </div>
        <div className="flex-grow overflow-y-auto">
          {inquiries.map(inquiry => (
            <button
              key={inquiry.id}
              onClick={() => openInquiry(inquiry)}
              className={`w-full text-left p-4 border-b border-ash-700/50 hover:bg-ash-700/50 ${selectedInquiry?.id === inquiry.id ? 'bg-harvest-500/10' : ''}`}
            >
              <p className={`truncate text-ash-100 ${inquiry.read ? 'font-normal' : 'font-semibold'}`}>{!inquiry.read && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-harvest-400" aria-label="Unread" />}{inquiry.name}</p>
              <p className="text-sm text-ash-400">{inquiry.email}</p>
              <p className="text-xs text-ash-500 mt-1">
                {formatDistanceToNow(getTimestamp(inquiry.submittedAt), { addSuffix: true })}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Main view */}
      <div className="w-2/3 flex flex-col">
        {selectedInquiry ? (
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-2xl font-bold text-ash-100 flex items-center gap-2"><User /> {selectedInquiry.name}</h3>
                    <a href={`mailto:${selectedInquiry.email}`} className="text-harvest-400 flex items-center gap-2 mt-1"><Mail className="w-4 h-4" /> {selectedInquiry.email}</a>
                    {selectedInquiry.phone && (
                        <a href={`tel:${selectedInquiry.phone}`} className="text-harvest-400 flex items-center gap-2 mt-1"><Phone className="w-4 h-4"/>{selectedInquiry.phone}</a>
                    )}
                </div>
                <div className="text-sm text-ash-400 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {format(getTimestamp(selectedInquiry.submittedAt), "PPP p")}
                </div>
            </div>
            <div className="whitespace-pre-wrap text-sm text-ash-200 bg-ash-900/50 p-4 rounded-lg border border-ash-700">
                {selectedInquiry.message}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-ash-500">Select an inquiry to view</p>
          </div>
        )}
      </div>
    </div>
  );
};
