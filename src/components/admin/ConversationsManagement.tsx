
'use client';

import { useState, useEffect, useRef } from 'react';
import { Conversation, Message } from '@/types/chat';
import { format, formatDistanceToNow } from 'date-fns';
import { Bot, User, PowerOff, Send, Loader2, MailWarning, MailCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { Switch } from '../ui/switch';
import { useToast } from '../ui/use-toast';
import { setAiSuspension, addAdminMessage, markConversationAsRead } from '@/app/actions';
import { rtdb } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';

interface ConvoWithPresence extends Conversation {
    isOnline?: boolean;
}

export const ConversationsManagement = ({ initialConversations }: { initialConversations: Conversation[] }) => {
  const [conversations, setConversations] = useState<ConvoWithPresence[]>(initialConversations);
  const [selectedConversation, setSelectedConversation] = useState<ConvoWithPresence | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const filteredConversations = conversations.filter(convo => 
    convo.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    convo.lastMessage?.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    // Listen for all conversations and statuses
    const chatsRef = ref(rtdb, 'chats');
    const statusRef = ref(rtdb, 'status');

    const unsubscribeChats = onValue(chatsRef, (snapshot) => {
        if (!snapshot.exists()) {
            setConversations([]);
            return;
        }

        const allChats = snapshot.val();
        const updatedConversations: ConvoWithPresence[] = Object.keys(allChats).map(uid => {
            const chatData = allChats[uid];
            const messages = chatData.messages ? Object.values(chatData.messages) as Message[] : [];
            return {
                id: uid,
                startTime: chatData.startTime,
                messages: messages,
                lastMessage: chatData.lastMessage,
                aiSuspended: chatData.aiSuspended || false,
                adminHasUnreadMessages: chatData.adminHasUnreadMessages || false,
                isOnline: false, // Default to offline
            };
        });

        setConversations(prev => {
            const convoMap = new Map(prev.map(c => [c.id, c]));
            updatedConversations.forEach(uc => {
                const existing = convoMap.get(uc.id);
                convoMap.set(uc.id, { ...existing, ...uc });
            });
            return Array.from(convoMap.values())
                 .sort((a, b) => (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0));
        });

        // If a conversation is selected, update its data
        setSelectedConversation(prev => {
            if (!prev) return null;
            const updated = allChats[prev.id];
            if (!updated) return null;

            const updatedMessages = updated.messages ? Object.values(updated.messages) as Message[] : [];
            updatedMessages.sort((a, b) => a.timestamp - b.timestamp);
            
            return {
                ...prev,
                messages: updatedMessages,
                lastMessage: updated.lastMessage,
                aiSuspended: updated.aiSuspended || false,
                adminHasUnreadMessages: updated.adminHasUnreadMessages || false,
            };
        });
    });
    
    const unsubscribeStatus = onValue(statusRef, (snapshot) => {
        if (!snapshot.exists()) return;
        const allStatuses = snapshot.val();
        setConversations(prev => prev.map(c => ({
            ...c,
            isOnline: allStatuses[c.id]?.isOnline || false,
        })));
        setSelectedConversation(prev => prev ? { ...prev, isOnline: allStatuses[prev.id]?.isOnline || false } : null);
    });

    // Select first conversation on initial load if none selected
    if (initialConversations.length > 0 && !selectedConversation) {
        const firstUnread = initialConversations.find(c => c.adminHasUnreadMessages) || initialConversations[0];
        handleSelectConversation(firstUnread);
    }
    
    return () => {
        unsubscribeChats();
        unsubscribeStatus();
    };
  }, []); // Run once on mount

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConversation?.messages]);

  const getTimestamp = (timestamp: number): Date => {
    return new Date(timestamp);
  };
  
  const handleSelectConversation = (convo: ConvoWithPresence) => {
    setSelectedConversation(convo);
    if(convo.adminHasUnreadMessages){
      markConversationAsRead(convo.id);
      setConversations(prev => 
        prev.map(c => c.id === convo.id ? { ...c, adminHasUnreadMessages: false } : c)
      );
    }
  };

  const handleAiToggle = async (suspended: boolean) => {
    if (!selectedConversation) return;

    const previousState = selectedConversation.aiSuspended;
    
    const updatedConversation = { ...selectedConversation, aiSuspended: suspended };
    setSelectedConversation(updatedConversation);

    try {
      const result = await setAiSuspension(selectedConversation.id, suspended);
      if (!result.success) throw new Error(result.error);
      
      toast({
        title: `AI ${suspended ? 'Suspended' : 'Re-enabled'}`,
        description: `The AI assistant has been ${suspended ? 'deactivated' : 'reactivated'} for this chat.`,
      });
    } catch (error) {
      toast({ 
        title: "Error", 
        description: (error as Error).message, 
        variant: 'destructive' 
      });
      // Revert on error
      setSelectedConversation(prev => ({ ...prev!, aiSuspended: previousState }));
    }
  };
  
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;
    
    setIsSending(true);
    try {
      const result = await addAdminMessage(selectedConversation.id, newMessage);
      if (!result.success) throw new Error(result.error);
      setNewMessage('');
    } catch (error) {
      toast({ 
        title: "Error", 
        description: (error as Error).message, 
        variant: 'destructive' 
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-150px)] bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
      {/* Conversations sidebar */}
      <div className="w-1/3 border-r border-gray-700 flex flex-col bg-gray-900">
        <div className="p-4 border-b border-gray-700 bg-gray-900 sticky top-0 z-10">
          <h2 className="text-xl font-bold text-white mb-4">Conversations</h2>
          <div className="relative">
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <svg 
              className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        
        <div className="flex-grow overflow-y-auto">
          {filteredConversations.length > 0 ? (
            filteredConversations.map(convo => (
              <button
                key={convo.id}
                onClick={() => handleSelectConversation(convo)}
                className={cn(
                  "w-full text-left p-4 border-b border-gray-800 hover:bg-gray-800/50 transition-colors duration-150 flex justify-between items-start",
                  selectedConversation?.id === convo.id 
                    ? "bg-indigo-900/30 border-l-4 border-l-indigo-400" 
                    : "bg-gray-900"
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      convo.isOnline ? "bg-green-400" : "bg-gray-600"
                    )} title={convo.isOnline ? "Online" : "Offline"} />
                    <p className="font-medium text-white truncate">
                      {convo.lastMessage?.content || 'New Conversation'}
                    </p>
                    {convo.adminHasUnreadMessages && (
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 flex-shrink-0" title="Unread messages"/>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                    <span className="truncate">ID: {convo.id}</span>
                    <span className="text-gray-600">•</span>
                    <span>
                      {formatDistanceToNow(
                        getTimestamp(convo.lastMessage?.timestamp || convo.startTime), 
                        { addSuffix: true }
                      )}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col items-end pl-2">
                  {convo.aiSuspended ? (
                    <PowerOff className="w-4 h-4 text-amber-400" title="AI Suspended"/>
                  ) : (
                    <Bot className="w-4 h-4 text-indigo-400" title="AI Active"/>
                  )}
                </div>
              </button>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-500">
              <MailWarning className="w-12 h-12 mb-4 text-gray-600" />
              <p>No conversations found</p>
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="mt-2 text-indigo-400 hover:text-indigo-300"
                >
                  Clear search
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chat panel */}
      <div className="w-2/3 flex flex-col bg-gray-900/50">
        {selectedConversation ? (
          <>
            {/* Chat header */}
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900 sticky top-0 z-10">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-white">
                    Conversation with {selectedConversation.id}
                  </h3>
                   <div className={cn(
                      "w-2.5 h-2.5 rounded-full flex-shrink-0",
                      selectedConversation.isOnline ? "bg-green-400" : "bg-gray-600"
                    )} title={selectedConversation.isOnline ? "Online" : "Offline"} />
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  Started {format(getTimestamp(selectedConversation.startTime), "PPP 'at' p")}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <label 
                    htmlFor="ai-toggle" 
                    className="text-sm font-medium text-gray-300"
                  >
                    AI Assistant
                  </label>
                  <span className="text-xs text-gray-500">
                    {selectedConversation.aiSuspended ? 'Suspended' : 'Active'}
                  </span>
                </div>
                <Switch
                  id="ai-toggle"
                  checked={!selectedConversation.aiSuspended}
                  onCheckedChange={(checked) => handleAiToggle(!checked)}
                  className="data-[state=checked]:bg-indigo-500"
                />
              </div>
            </div>
            
            {/* Messages container */}
            <div className="flex-grow p-4 space-y-6 overflow-y-auto">
              {selectedConversation.messages.length > 0 ? (
                selectedConversation.messages.map((message, index) => (
                  <div 
                    key={index} 
                    className={cn(
                      "flex gap-3 group",
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {message.role === 'model' && (
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-indigo-400" />
                      </div>
                    )}
                    
                    <div className="max-w-[80%]">
                      <div className={cn(
                        "p-4 rounded-2xl",
                        message.role === 'user' 
                          ? 'bg-gray-800 rounded-tr-none' 
                          : 'bg-gray-800/70 rounded-tl-none'
                      )}>
                        <ReactMarkdown className="prose prose-invert prose-sm break-words">
                          {message.content}
                        </ReactMarkdown>
                      </div>
                      <div className={cn(
                        "mt-1.5 text-xs text-gray-500 px-1",
                        message.role === 'user' ? 'text-right' : 'text-left'
                      )}>
                        {format(getTimestamp(message.timestamp), 'h:mm a')}
                      </div>
                    </div>
                    
                    {message.role === 'user' && (
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-300" />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 text-gray-500">
                  <MailCheck className="w-16 h-16 mb-4 text-gray-700" />
                  <h3 className="text-lg font-medium text-gray-300 mb-2">No messages yet</h3>
                  <p className="max-w-md">Start the conversation by sending a message below</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Input area */}
            <form 
              onSubmit={handleAdminSubmit}
              className="p-4 border-t border-gray-800 bg-gray-900/80 sticky bottom-0"
            >
              <div className="relative">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="w-full pr-12 p-3 border border-gray-700 rounded-xl bg-gray-800 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:outline-none"
                  disabled={isSending}
                />
                <button
                  type="submit"
                  disabled={isSending || !newMessage.trim()}
                  className={cn(
                    "absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors",
                    !isSending && newMessage.trim()
                      ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                      : "bg-gray-700 text-gray-500 cursor-not-allowed"
                  )}
                >
                  {isSending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="bg-gray-800/50 border-2 border-dashed border-gray-700 rounded-2xl p-12 max-w-md">
              <Bot className="w-16 h-16 mx-auto mb-6 text-gray-500" />
              <h3 className="text-xl font-semibold text-gray-300 mb-2">No conversation selected</h3>
              <p className="text-gray-500 mb-6">
                Select a conversation from the list to view messages and interact with the user
              </p>
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-sm text-gray-400">
                <p className="font-medium mb-1">Tip:</p>
                <p>Unread conversations have a <span className="inline-block w-2 h-2 bg-indigo-400 rounded-full"></span> indicator</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
