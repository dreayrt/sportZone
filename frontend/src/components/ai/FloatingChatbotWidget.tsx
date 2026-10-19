'use client';

import Link from 'next/link';
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import {
  Bot,
  CalendarClock,
  ExternalLink,
  Loader2,
  MapPin,
  MessageCircle,
  Send,
  Star,
  UserRound,
  X,
} from 'lucide-react';
import { api, AiChatData, AiChatHistoryMessage } from '@/lib/api';

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  data?: AiChatData;
  isError?: boolean;
}

const quickPrompts = [
  'Tìm sân pickleball tối nay',
  'Tìm sân cầu lông ngày mai',
  'Chính sách hủy sân là gì?',
  'Tôi được tích điểm như thế nào?',
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

export function FloatingChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: 'assistant',
      content: 'Xin chào! Mình có thể giúp bạn tìm sân từ dữ liệu SportZone hoặc giải đáp các chính sách hiện có.',
    },
  ]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const nextId = useRef(2);

  useEffect(() => {
    if (isOpen) {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
      window.setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, messages, isSending]);

  const sendMessage = async (rawMessage: string) => {
    const message = rawMessage.trim();
    if (!message || isSending) return;

    const history: AiChatHistoryMessage[] = messages
      .slice(-6)
      .map((item) => ({
        role: item.role,
        content: item.content.trim().slice(0, 500),
      }))
      .filter((item) => item.content !== '');
    const userMessage: ChatMessage = {
      id: nextId.current++,
      role: 'user',
      content: message,
    };

    setMessages((current) => [...current, userMessage]);
    setInput('');
    setIsSending(true);

    const response = await api.ai.chat(message, history);

    if (response.success && response.data) {
      const data = response.data;
      setMessages((current) => [
        ...current,
        {
          id: nextId.current++,
          role: 'assistant',
          content: data.answer || data.message || response.message,
          data,
        },
      ]);
    } else {
      setMessages((current) => [
        ...current,
        {
          id: nextId.current++,
          role: 'assistant',
          content: response.message || 'Trợ lý AI hiện tạm thời không khả dụng. Vui lòng thử lại sau.',
          isError: true,
        },
      ]);
    }

    setIsSending(false);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void sendMessage(input);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[70] sm:bottom-6 sm:right-6">
      {isOpen && (
        <section
          className="mb-3 flex h-[min(680px,calc(100dvh-7rem))] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl sm:w-[420px]"
          aria-label="Trợ lý đặt sân SportZone"
        >
          <header className="flex items-center justify-between bg-neutral-950 px-4 py-3 text-white">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-neutral-950">
                <Bot className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-semibold">Trợ lý SportZone</h2>
                <p className="text-xs text-neutral-400">Gemini + dữ liệu sân thực tế</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-2 text-neutral-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Đóng trợ lý"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto bg-neutral-50 p-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Bot className="h-4 w-4" aria-hidden="true" />
                  </span>
                )}
                <div className={`max-w-[86%] space-y-3 ${message.role === 'user' ? 'items-end' : ''}`}>
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      message.role === 'user'
                        ? 'rounded-br-md bg-neutral-900 text-white'
                        : message.isError
                          ? 'rounded-bl-md border border-red-200 bg-red-50 text-red-700'
                          : 'rounded-bl-md border border-neutral-200 bg-white text-neutral-700'
                    }`}
                  >
                    {message.content}
                  </div>

                  {message.data?.type === 'search_results' && message.data.results && (
                    <div className="space-y-2">
                      {message.data.results.map((result) => (
                        <article key={result.court_id} className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="text-sm font-semibold text-neutral-900">{result.court_name}</h3>
                              <p className="mt-0.5 text-xs font-medium text-emerald-700">{result.venue_name}</p>
                            </div>
                            <span className="flex items-center gap-1 text-xs font-semibold text-amber-600">
                              <Star className="h-3.5 w-3.5 fill-current" /> {result.rating.toFixed(1)}
                            </span>
                          </div>
                          <p className="mt-2 flex items-start gap-1.5 text-xs text-neutral-500">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>{result.address}</span>
                          </p>
                          <div className="mt-2 flex items-center justify-between text-xs">
                            <span className="text-neutral-500">{result.sport}</span>
                            <span className="font-semibold text-neutral-900">Từ {formatCurrency(result.price)}</span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {result.available_slots.slice(0, 3).map((slot) => (
                              <span
                                key={`${slot.start_time}-${slot.end_time}`}
                                className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700"
                              >
                                <CalendarClock className="h-3 w-3" /> {slot.start_time}–{slot.end_time}
                              </span>
                            ))}
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <Link
                              href={`/venues/${result.slug}`}
                              className="rounded-lg border border-neutral-200 px-2 py-2 text-center text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
                            >
                              Xem sân
                            </Link>
                            <Link
                              href={`/booking/${result.court_id}`}
                              className="inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-500 px-2 py-2 text-xs font-semibold text-neutral-950 transition hover:bg-emerald-400"
                            >
                              Đặt sân <ExternalLink className="h-3 w-3" />
                            </Link>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}

                  {message.data?.type === 'knowledge' && message.data.sources && message.data.sources.length > 0 && (
                    <p className="px-1 text-[11px] text-neutral-400">
                      Nguồn: {message.data.sources.join(', ')}
                    </p>
                  )}
                </div>
                {message.role === 'user' && (
                  <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-neutral-600">
                    <UserRound className="h-4 w-4" aria-hidden="true" />
                  </span>
                )}
              </div>
            ))}

            {isSending && (
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Bot className="h-4 w-4" />
                </span>
                <span className="rounded-2xl border border-neutral-200 bg-white px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-label="Đang xử lý" />
                </span>
              </div>
            )}
          </div>

          <div className="border-t border-neutral-200 bg-white p-3">
            <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void sendMessage(prompt)}
                  disabled={isSending}
                  className="shrink-0 rounded-full border border-neutral-200 bg-white px-2.5 py-1.5 text-[11px] text-neutral-600 transition hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                maxLength={500}
                placeholder="Nhập câu hỏi..."
                className="max-h-24 min-h-10 flex-1 resize-none rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                aria-label="Tin nhắn cho trợ lý SportZone"
              />
              <button
                type="submit"
                disabled={isSending || input.trim() === ''}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Gửi tin nhắn"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-950 text-white shadow-xl ring-4 ring-white transition hover:scale-105 hover:bg-neutral-800 focus:outline-none focus:ring-emerald-200"
        aria-label={isOpen ? 'Đóng trợ lý SportZone' : 'Mở trợ lý SportZone'}
        aria-expanded={isOpen}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}
