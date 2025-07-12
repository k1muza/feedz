
'use client';

import { useState } from 'react';
import { ContactInquiry } from '@/types';
import { format, formatDistanceToNow } from 'date-fns';
import { Mail, Calendar, User } from 'lucide-react';

export const InquiryManagement = ({ initialInquiries }: { initialInquiries: ContactInquiry[] }) => {
  const [inquiries] = useState<ContactInquiry[]>(initialInquiries);
  const [selectedInquiry, setSelectedInquiry] = useState<ContactInquiry | null>(inquiries[0] || null);

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
    <div className="flex h-[calc(100vh-150px)] bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
      {/* Sidebar with inquiries list */}
      <div className="w-1/3 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><Mail/> Inquiries</h2>
        </div>
        <div className="flex-grow overflow-y-auto">
          {inquiries.map(inquiry => (
            <button
              key={inquiry.id}
              onClick={() => setSelectedInquiry(inquiry)}
              className={`w-full text-left p-4 border-b border-gray-700/50 hover:bg-gray-700/50 ${selectedInquiry?.id === inquiry.id ? 'bg-indigo-500/10' : ''}`}
            >
              <p className="font-semibold text-white truncate">{inquiry.name}</p>
              <p className="text-sm text-gray-400">{inquiry.email}</p>
              <p className="text-xs text-gray-500 mt-1">
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
                    <h3 className="text-2xl font-bold text-white">{selectedInquiry.name}</h3>
                    <p className="text-indigo-400">{selectedInquiry.email}</p>
                </div>
                <div className="text-sm text-gray-400 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {format(getTimestamp(selectedInquiry.submittedAt), "PPP p")}
                </div>
            </div>
            <div className="prose prose-invert prose-sm max-w-none bg-gray-900/50 p-4 rounded-lg">
                <p>{selectedInquiry.message}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Select an inquiry to view</p>
          </div>
        )}
      </div>
    </div>
  );
};
