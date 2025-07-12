import { ConversationsManagement } from '@/components/admin/ConversationsManagement';
import { getConversations } from '@/app/actions';
import { Conversation } from '@/types/chat';

export default async function ConversationsPage() {
  const conversations: Conversation[] = await getConversations();

  return (
    <div className="container mx-auto px-4 h-full">
      <ConversationsManagement initialConversations={conversations} />
    </div>
  );
}
