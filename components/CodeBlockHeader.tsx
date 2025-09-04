import React, { useState } from 'react';
import { CopyIcon, CheckIcon } from './icons';

interface CodeBlockHeaderProps {
  language: string | undefined;
  codeText: string;
}

const CodeBlockHeader: React.FC<CodeBlockHeaderProps> = ({ language, codeText }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeText).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }, (err) => {
      console.error('Failed to copy text: ', err);
    });
  };

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between bg-slate-200 dark:bg-slate-900/50 px-4 py-2 border-b border-slate-300 dark:border-slate-700">
      <span className="text-xs font-sans font-medium uppercase text-slate-500 dark:text-slate-400">{language || 'code'}</span>
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 text-xs font-sans text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        aria-label="Copy code"
      >
        {isCopied ? (
          <>
            <CheckIcon className="w-3.5 h-3.5 text-green-500" />
            Copied!
          </>
        ) : (
          <>
            <CopyIcon className="w-3.5 h-3.5" />
            Copy
          </>
        )}
      </button>
    </div>
  );
};

export default CodeBlockHeader;
