
'use client';

import { useState } from 'react';
import { Conversation, Message } from '@/types/chat';
import { format, formatDistanceToNow } from 'date-fns';
import { Bot, User, Power, PowerOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { Switch } from '../ui/switch';
import { useToast } from '../ui/use-toast';
import { setAiSuspension } from '@/app/actions';

export const ConversationsManagement = ({ initialConversations }: { initialConversations: Conversation[] }) => {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(conversations[0] || null);
  const { toast } = useToast();

  const getTimestamp = (timestamp: number): Date => {
    return new Date(timestamp);
  };

  const handleAiToggle = async (conversationId: string, suspended: boolean) => {
    if (!selectedConversation) return;

    // Optimistically update UI
    const updatedConversation = { ...selectedConversation, aiSuspended: suspended };
    setSelectedConversation(updatedConversation);
    setConversations(prev => prev.map(c => c.id === conversationId ? updatedConversation : c));

    const result = await setAiSuspension(conversationId, suspended);

    if (result.success) {
      toast({
        title: `AI ${suspended ? 'Suspended' : 'Re-enabled'}`,
        description: `The AI assistant has been ${suspended ? 'deactivated' : 'reactivated'} for this chat.`,
      });
    } else {
      // Revert UI on failure
      toast({ title: "Error", description: result.error, variant: 'destructive' });
      setSelectedConversation(prev => ({ ...prev!, aiSuspended: !suspended }));
       setConversations(prev => prev.map(c => c.id === conversationId ? ({ ...c, aiSuspended: !suspended }) : c));
    }
  };

  return (
    <div className="flex h-[calc(100vh-150px)] bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
      {/* Sidebar with conversations list */}
      <div className="w-1/3 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">All Conversations</h2>
        </div>
        <div className="flex-grow overflow-y-auto">
          {conversations.map(convo => (
            <button
              key={convo.id}
              onClick={() => setSelectedConversation(convo)}
              className={cn(
                "w-full text-left p-4 border-b border-gray-700/50 hover:bg-gray-700/50",
                selectedConversation?.id === convo.id && "bg-indigo-500/10"
              )}
            >
              <div className="flex justify-between items-start">
                <p className="font-semibold text-white truncate pr-2">
                  {convo.lastMessage?.content || 'New Conversation'}
                </p>
                {convo.aiSuspended && <PowerOff className="w-4 h-4 text-yellow-400 flex-shrink-0" title="AI Suspended"/>}
              </div>
              <p className="text-sm text-gray-400">
                {formatDistanceToNow(getTimestamp(convo.startTime), { addSuffix: true })}
              </p>
              <p className="text-xs text-gray-500 mt-1">{convo.messages.length} messages</p>
            </button>
          ))}
        </div>
      </div>

      {/* Main chat view */}
      <div className="w-2/3 flex flex-col">
        {selectedConversation ? (
          <>
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-white">
                  Conversation from {format(getTimestamp(selectedConversation.startTime), "PPP p")}
                </h3>
                <p className="text-sm text-gray-400">User ID: {selectedConversation.id}</p>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="ai-toggle" className="text-sm text-gray-300">
                  {selectedConversation.aiSuspended ? 'AI Suspended' : 'AI Active'}
                </label>
                <Switch
                  id="ai-toggle"
                  checked={!selectedConversation.aiSuspended}
                  onCheckedChange={(checked) => handleAiToggle(selectedConversation.id, !checked)}
                  aria-label="Toggle AI assistant for this chat"
                />
              </div>
            </div>
            <div className="flex-grow p-4 space-y-4 overflow-y-auto">
              {selectedConversation.messages.map((message, index) => (
                <div key={index} className={cn("flex items-start gap-3", message.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {message.role === 'model' && (
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-indigo-400" />
                    </div>
                  )}
                  <div className={cn(
                    "p-3 rounded-lg max-w-lg prose prose-invert prose-sm",
                    message.role === 'user' ? 'bg-gray-700' : 'bg-gray-900/80'
                  )}>
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                   {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gray-600/50 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-gray-300" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Select a conversation to view</p>
          </div>
        )}
      </div>
    </div>
  );
};
