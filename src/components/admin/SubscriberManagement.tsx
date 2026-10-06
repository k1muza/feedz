
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
      <h2 className="text-2xl font-bold text-ash-100 flex items-center gap-2">
        <Newspaper /> Newsletter Subscribers
      </h2>
      <div className="bg-ash-800/50 border border-ash-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-ash-700">
            <thead className="bg-ash-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-ash-400 uppercase tracking-wider">Email Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-ash-400 uppercase tracking-wider">Subscription Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ash-700">
              {subscribers.map((sub) => (
                <tr key={sub.id} className="hover:bg-ash-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-ash-100">{sub.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-ash-400">
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
