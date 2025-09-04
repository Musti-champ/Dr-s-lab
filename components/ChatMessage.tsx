import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SparkleIcon, UserIcon, CopyIcon, CheckIcon } from './icons';
import { CodeBlock } from './CodeBlock';
import { StudioMessage } from './StudioMessage';

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  isLoading?: boolean;
  imageUrl?: string;
  theme: string;
  isStudio?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isUser, isLoading = false, imageUrl, theme, isStudio = false }) => {
  const [isCopied, setIsCopied] = useState(false);
  
  const containerStyles = isUser 
    ? 'bg-white dark:bg-gray-900' 
    : isStudio ? 'bg-transparent dark:bg-transparent' : 'bg-slate-50 dark:bg-gray-800';
    
  const avatarContainerStyles = 'bg-gray-100 dark:bg-gray-700';
  const avatarIconStyles = 'text-gray-600 dark:text-gray-300';

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }, (err) => {
      console.error('Failed to copy message: ', err);
    });
  };

  const LoadingDots = () => (
    <div className="flex items-center space-x-1">
        <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce"></div>
    </div>
  );
  
  if (isStudio) {
      return <StudioMessage content={message} theme={theme} />;
  }

  // Logic to split Studio tool responses into code and explanation
  const explanationMarkerRegex = /^### Explanation$/im;
  let codeContent = message;
  let explanationContent = null;
  
  const match = message.match(explanationMarkerRegex);

  if (!isUser && match && match.index) {
    codeContent = message.substring(0, match.index).trim();
    explanationContent = message.substring(match.index).trim();
  }

  return (
    <div className={`relative group w-full max-w-3xl mx-auto px-2 sm:px-4 py-4 rounded-lg ${containerStyles}`}>
       <div className={`flex items-start space-x-4`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${avatarContainerStyles}`}>
            {isUser 
              ? <UserIcon className={`w-5 h-5 ${avatarIconStyles}`} /> 
              : <SparkleIcon className={`w-5 h-5 ${avatarIconStyles}`} />
            }
        </div>
        <div className={`flex-1 pt-0.5 prose sm:prose-base max-w-none text-gray-800 dark:prose-invert prose-headings:font-semibold prose-a:text-indigo-600 hover:prose-a:text-indigo-500 prose-code:font-mono prose-code:text-sm prose-code:before:content-none prose-code:after:content-none max-h-[80vh] overflow-y-auto`}>
           {isLoading ? <LoadingDots /> : (
            <>
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                    code: (props) => <CodeBlock {...props} theme={theme} children={props.children ?? ''} />,
                }}
              >
                  {codeContent}
              </ReactMarkdown>
              
              {explanationContent && (
                  <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                           components={{
                                code: (props) => <CodeBlock {...props} theme={theme} children={props.children ?? ''} />,
                           }}
                      >
                          {explanationContent}
                      </ReactMarkdown>
                  </div>
              )}

              {imageUrl && (
                <div className="mt-4">
                  <img 
                    src={imageUrl} 
                    alt="Generated content" 
                    className="rounded-lg border border-gray-200 dark:border-gray-700 max-w-full h-auto shadow-md"
                  />
                </div>
              )}
            </>
           )}
        </div>
      </div>
      {!isLoading && message && (
        <button
          onClick={handleCopyMessage}
          className="absolute top-2 right-2 p-1.5 rounded-md bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Copy message"
          title="Copy message"
        >
          {isCopied ? (
            <CheckIcon className="w-4 h-4 text-green-500" />
          ) : (
            <CopyIcon className="w-4 h-4" />
          )}
        </button>
      )}
    </div>
  );
};

export default ChatMessage;