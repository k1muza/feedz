'use client';

import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, MessageSquare, Send, X, Loader2, User } from 'lucide-react';
import { Conversation, Message } from '@/types/chat';
import { startOrGetConversation, addMessage } from '@/app/actions';
import { Timestamp } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    const initChat = async () => {
      const storedId = localStorage.getItem('conversationId');
      const convo = await startOrGetConversation(storedId || undefined);
      setConversation(convo);
      if (!storedId) {
        localStorage.setItem('conversationId', convo.id);
      }
    };
    initChat();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversation) return;

    setIsLoading(true);
    const tempUserMessage: Message = {
        role: 'user',
        content: newMessage,
        timestamp: Timestamp.now()
    }
    setConversation(prev => prev ? ({ ...prev, messages: [...prev.messages, tempUserMessage] }) : null);
    setNewMessage('');
    
    try {
      const updatedConversation = await addMessage(conversation.id, newMessage);
      setConversation(updatedConversation);
    } catch (error) {
      console.error("Failed to send message:", error);
      // Optionally, add an error message to the chat
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-5 right-5 z-50">
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-green-600 text-white p-4 rounded-full shadow-lg hover:bg-green-700 transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
        </motion.button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 right-5 w-full max-w-sm h-[70vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center space-x-3 bg-gray-50 dark:bg-gray-800">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                <Bot className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">FeedSport AI Assistant</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Your nutrition & sales expert</p>
              </div>
            </header>

            {/* Messages */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {conversation?.messages.map((message, index) => (
                <div key={index} className={cn("flex items-start gap-3", message.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {message.role === 'model' && (
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                  )}
                  <div className={cn(
                    "p-3 rounded-lg max-w-xs prose prose-sm dark:prose-invert",
                    message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                  )}>
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-gray-500 dark:text-gray-300" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                 <div className="flex items-start gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                        <Loader2 className="w-5 h-5 animate-spin"/>
                    </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="relative">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Ask about products or advice..."
                  className="w-full pr-12 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !newMessage.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={18} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
