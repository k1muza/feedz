'use client';

import { useState } from 'react';
import { Conversation, Message } from '@/types/chat';
import { format, formatDistanceToNow } from 'date-fns';
import { Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

export const ConversationsManagement = ({ initialConversations }: { initialConversations: Conversation[] }) => {
  const [conversations] = useState<Conversation[]>(initialConversations);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(conversations[0] || null);

  const getTimestamp = (timestamp: number): Date => {
    return new Date(timestamp);
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
              <p className="font-semibold text-white truncate">
                {convo.lastMessage?.content || 'New Conversation'}
              </p>
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
            <div className="p-4 border-b border-gray-700">
              <h3 className="font-semibold text-white">
                Conversation from {format(getTimestamp(selectedConversation.startTime), "PPP p")}
              </h3>
              <p className="text-sm text-gray-400">User ID: {selectedConversation.id}</p>
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
