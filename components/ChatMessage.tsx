import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SparkleIcon, UserIcon } from './icons';

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  isLoading?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isUser, isLoading = false }) => {
  const containerStyles = isUser 
    ? 'bg-white dark:bg-gray-900' 
    : 'bg-slate-50 dark:bg-gray-800';
    
  const avatarContainerStyles = 'bg-gray-100 dark:bg-gray-700';
  const avatarIconStyles = 'text-gray-600 dark:text-gray-300';

  const LoadingDots = () => (
    <div className="flex items-center space-x-1">
        <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce"></div>
    </div>
  );

  return (
    <div className={`w-full max-w-3xl mx-auto px-2 sm:px-4 py-4 rounded-lg ${containerStyles}`}>
       <div className={`flex items-start space-x-4`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${avatarContainerStyles}`}>
            {isUser 
              ? <UserIcon className={`w-5 h-5 ${avatarIconStyles}`} /> 
              : <SparkleIcon className={`w-5 h-5 ${avatarIconStyles}`} />
            }
        </div>
        <div className={`flex-1 pt-0.5 prose sm:prose-base max-w-none text-gray-800 dark:prose-invert prose-headings:font-semibold prose-a:text-indigo-600 hover:prose-a:text-indigo-500 prose-code:bg-slate-100 dark:prose-code:bg-slate-800 prose-code:p-1 prose-code:rounded max-h-[40vh] overflow-y-auto`}>
           {isLoading ? <LoadingDots /> : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message}
            </ReactMarkdown>
           )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;