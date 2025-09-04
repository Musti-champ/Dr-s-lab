
import React, { useEffect, useRef } from 'react';
import ChatInput from './ChatInput';
import ChatMessage from './ChatMessage';
import type { Message } from '../App';

interface MainContentProps {
  messages: Message[];
  isLoading: boolean;
  onSend: (prompt: string) => void;
}

const MainContent: React.FC<MainContentProps> = ({ messages, isLoading, onSend }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col p-2 sm:p-4 overflow-hidden">
       <div className="flex-1 overflow-y-auto space-y-4 pr-4">
        {messages.map((msg, index) => (
          <ChatMessage key={index} message={msg.text} isUser={msg.isUser} />
        ))}
         {isLoading && <ChatMessage message="" isUser={false} isLoading={true} />}
        <div ref={messagesEndRef} />
      </div>
      <div className="w-full max-w-3xl mx-auto pt-4">
        <ChatInput onSend={onSend} disabled={isLoading} />
      </div>
    </div>
  );
};

export default MainContent;