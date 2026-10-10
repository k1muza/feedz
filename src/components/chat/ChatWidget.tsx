'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Send, X } from 'lucide-react';

type Message = { from: 'user' | 'feedsport'; text: string };

const prompts = [
  'Which ingredients do I need for a pig grower diet?',
  'What is the minimum order for soybean meal?',
  'Can I replace some soybean meal with sunflower meal?',
  'Do you deliver outside Harare?',
];

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);

  const send = (text: string) => {
    if (!text.trim()) return;
    setMessages((current) => [...current, { from: 'user', text: text.trim() }, { from: 'feedsport', text: 'Thanks — this preview uses hardcoded content. Send the request on WhatsApp and the FeedSport team will confirm the product, stock or formulation advice.' }]);
    setInput('');
  };
  const submit = (event: FormEvent) => { event.preventDefault(); send(input); };

  return (
    <>
      <nav aria-label="Quick actions" className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-[1fr_1fr_1.3fr] gap-1.5 border-t border-[#d9d4c7] bg-[#fbfaf6] px-2.5 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 min-[1080px]:hidden">
        <a href="tel:+263774684534" className="flex h-[52px] flex-col items-center justify-center gap-0.5 text-[13px] font-semibold text-[#191b18] no-underline"><i className="h-2 w-2 rounded-full bg-[#1d3a2a]" />Call</a>
        <a href="https://wa.me/263774684534" className="flex h-[52px] flex-col items-center justify-center gap-0.5 text-[13px] font-semibold text-[#191b18] no-underline"><i className="h-2 w-2 rounded-full bg-[#2e7d4f]" />WhatsApp</a>
        <a href="https://wa.me/263774684534?text=I%20would%20like%20a%20quote" className="flex h-[52px] items-center justify-center rounded-[4px] bg-[#d99a2b] text-[15px] font-bold text-[#191b18] no-underline">Get a quote</a>
      </nav>
      <div className="fixed bottom-6 right-6 z-50 hidden min-[1080px]:block"><button onClick={() => setIsOpen((open) => !open)} className="flex h-[52px] items-center gap-2.5 rounded-full border-0 bg-[#1d3a2a] px-5 pl-4 text-[15px] font-semibold text-white shadow-[0_10px_30px_rgb(25_27_24/.25)]"><i className="h-2.5 w-2.5 rotate-45 bg-[#d99a2b]" />{isOpen ? 'Close chat' : 'Ask FeedSport'}</button></div>

      <AnimatePresence>
        {isOpen && <motion.aside initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} aria-label="Ask FeedSport" className="fixed bottom-[76px] left-2 right-2 top-[72px] z-[55] flex flex-col overflow-hidden rounded-[10px] border border-[#d9d4c7] bg-[#fbfaf6] shadow-[0_20px_60px_rgb(25_27_24/.3)] min-[1080px]:bottom-6 min-[1080px]:left-auto min-[1080px]:right-6 min-[1080px]:top-auto min-[1080px]:h-[540px] min-[1080px]:w-[380px]">
          <header className="flex items-start justify-between gap-3 bg-[#1d3a2a] px-[18px] py-4 text-white"><div><h2 className="m-0 text-[17px] font-bold leading-tight">Ask FeedSport</h2><p className="m-0 mt-1 text-[13px] leading-[1.4] text-[#dfe6dc]">Products, stock and practical feeding advice.</p></div><button onClick={() => setIsOpen(false)} aria-label="Close chat" className="flex h-9 w-9 shrink-0 items-center justify-center border-0 bg-transparent p-0 text-white"><X size={22} /></button></header>
          <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto bg-[#fbfaf6] px-[18px] py-4">
            {messages.length === 0 && <div><p className="fs-label mb-2.5 mt-0 text-[#62635b]">Common questions</p><div className="flex flex-col gap-2">{prompts.map((prompt) => <button key={prompt} onClick={() => send(prompt)} className="rounded-[4px] border border-[#d9d4c7] bg-[#f3f0e8] p-3 text-left text-[14px] leading-[1.4] text-[#191b18]">{prompt}</button>)}</div></div>}
            {messages.map((message, index) => <div key={index} className={`max-w-[85%] rounded-[4px] px-3.5 py-3 text-[14px] leading-[1.5] ${message.from === 'user' ? 'self-end bg-[#1d3a2a] text-white' : 'self-start border border-[#d9d4c7] bg-[#f3f0e8] text-[#4f524b]'}`}>{message.text}</div>)}
            <div ref={endRef} />
          </div>
          <form onSubmit={submit} className="flex gap-2 border-t border-[#d9d4c7] bg-[#fbfaf6] p-3"><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about products or advice…" className="h-[46px] min-w-0 flex-1 rounded-[4px] border border-[#bdb7a9] bg-white px-3 text-[15px] text-[#191b18] outline-none placeholder:text-[#797a72] focus:border-[#1d3a2a]" /><button type="submit" aria-label="Send message" disabled={!input.trim()} className="flex h-[46px] items-center justify-center rounded-[4px] border-0 bg-[#1d3a2a] px-4 text-white disabled:cursor-not-allowed disabled:opacity-50"><Send size={18} /></button></form>
        </motion.aside>}
      </AnimatePresence>
    </>
  );
}
