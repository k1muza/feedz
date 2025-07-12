
'use client';

import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageSquare, Send, X, Bot, User } from 'lucide-react';
import { Conversation, Message } from '@/types/chat';
import { startOrGetConversation, addMessage } from '@/app/actions';
import { Timestamp } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    const initChat = async () => {
      const storedId = localStorage.getItem('conversationId');
      let convo = await startOrGetConversation(storedId || undefined);

      // Seed conversation with a welcome message if it's new
      if (!storedId && convo.messages.length === 0) {
        const welcomeMessage: Message = {
          role: 'model',
          content: "Hi there! I'm Feedy, your friendly AI assistant. How can I help you with your animal nutrition needs today?",
          timestamp: Timestamp.now(),
        };
        convo.messages.push(welcomeMessage);
      }

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
            className="fixed bottom-20 right-5 w-full max-w-sm h-[70vh] bg-gray-800/50 rounded-xl shadow-2xl border border-gray-700 flex flex-col z-50 overflow-hidden backdrop-blur-lg"
          >
            {/* Header */}
            <header className="p-4 border-b border-gray-700/50 flex items-center space-x-3 bg-gray-800/70">
              <div className="relative w-10 h-10">
                <Image src="https://placehold.co/40x40.png" data-ai-hint="robot mascot" alt="Feedy Avatar" fill className="rounded-full" />
              </div>
              <div>
                <h3 className="font-bold text-white">Feedy</h3>
                <p className="text-sm text-gray-400 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></span>
                    Online
                </p>
              </div>
            </header>

            {/* Messages */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {conversation?.messages.map((message, index) => (
                <div key={index} className={cn("flex items-start gap-3", message.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {message.role === 'model' && (
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                      <Image src="https://placehold.co/32x32.png" data-ai-hint="robot mascot" alt="Feedy Avatar" width={32} height={32} className="rounded-full" />
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
              {isLoading && (
                 <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-3 justify-start"
                 >
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                      <Image src="https://placehold.co/32x32.png" data-ai-hint="robot mascot" alt="Feedy Avatar" width={32} height={32} className="rounded-full" />
                    </div>
                    <div className="p-3 rounded-lg bg-gray-900/80 text-gray-400 text-sm italic">
                        Feedy is typing...
                    </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700/50 bg-gray-800">
              <div className="relative">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Ask about products or advice..."
                  className="w-full pr-12 p-3 border border-gray-600 rounded-lg bg-gray-700 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !newMessage.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
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
