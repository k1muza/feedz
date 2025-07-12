
import { getNewsletterSubscriptions } from '@/app/actions';
import { SubscriberManagement } from '@/components/admin/SubscriberManagement';
import { NewsletterSubscription } from '@/types';

export default async function SubscribersPage() {
  const subscribers: NewsletterSubscription[] = await getNewsletterSubscriptions();

  return (
    <div className="container mx-auto px-4">
      <SubscriberManagement initialSubscribers={subscribers} />
    </div>
  );
}
