
'use client';

import { useState } from 'react';
import { NewsletterSubscription } from '@/types';
import { format } from 'date-fns';
import { Newspaper } from 'lucide-react';

export const SubscriberManagement = ({ initialSubscribers }: { initialSubscribers: NewsletterSubscription[] }) => {
  const [subscribers] = useState<NewsletterSubscription[]>(initialSubscribers);
  
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
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
        <Newspaper /> Newsletter Subscribers
      </h2>
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Email Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Subscription Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {subscribers.map((sub) => (
                <tr key={sub.id} className="hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{sub.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {format(getTimestamp(sub.subscribedAt), 'PPP')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
