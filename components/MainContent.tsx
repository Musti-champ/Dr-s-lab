
import React, { useEffect, useRef } from 'react';
import ChatInput from './ChatInput';
import ChatMessage from './ChatMessage';
import type { Message } from '../App';
import { SparkleIcon } from './icons';

interface MainContentProps {
  messages: Message[];
  isLoading: boolean;
  onSend: (prompt: string) => void;
  isConversationMode: boolean;
  autoListenTrigger: number;
  theme: string;
}

const MainContent: React.FC<MainContentProps> = ({ messages, isLoading, onSend, isConversationMode, autoListenTrigger, theme }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
      <SparkleIcon className="w-16 h-16 mb-4 text-indigo-300 dark:text-indigo-500" />
      <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-200">Welcome to Dr's Lab AI</h2>
      <p className="mt-2 max-w-md">
        This is your personal AI assistant. Start a conversation by typing in the box below, or use the microphone for voice commands.
      </p>
    </div>
  );


  return (
    <div className="flex-1 flex flex-col p-2 sm:p-4 overflow-hidden">
       <div className="flex-1 overflow-y-auto space-y-4 pr-4">
        {messages.length === 0 && !isLoading ? (
          <EmptyState />
        ) : (
          <>
            {messages.map((msg, index) => (
              <ChatMessage 
                key={index} 
                message={msg.text} 
                isUser={msg.isUser}
                imageUrl={msg.imageUrl}
                theme={theme}
              />
            ))}
             {isLoading && <ChatMessage message="" isUser={false} isLoading={true} theme={theme} />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      <div className="w-full max-w-3xl mx-auto pt-4">
        <ChatInput 
            onSend={onSend} 
            disabled={isLoading} 
            isConversationMode={isConversationMode} 
            autoListenTrigger={autoListenTrigger}
        />
      </div>
    </div>
  );
};

export default MainContent;