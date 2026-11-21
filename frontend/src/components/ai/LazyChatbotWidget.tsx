'use client';

import dynamic from 'next/dynamic';

// Loaded after hydration so the chatbot code stays out of the initial bundle of every page.
const FloatingChatbotWidget = dynamic(
  () => import('@/components/ai/FloatingChatbotWidget').then((m) => m.FloatingChatbotWidget),
  { ssr: false },
);

export function LazyChatbotWidget() {
  return <FloatingChatbotWidget />;
}
