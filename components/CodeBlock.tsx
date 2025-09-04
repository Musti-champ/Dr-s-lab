import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import CodeBlockHeader from './CodeBlockHeader';

interface CodeBlockProps {
    node?: any;
    inline?: boolean;
    className?: string;
    children: React.ReactNode;
    theme: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ node, inline, className, children, theme, ...props }) => {
  const match = /language-(\w+)/.exec(className || '');
  const codeText = String(children).replace(/\n$/, '');
  const language = match ? match[1] : undefined;

  if (!inline) {
    return (
      <div className="relative group my-4 text-sm rounded-md border border-slate-300 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-900">
        <CodeBlockHeader language={language} codeText={codeText} />
        <div className="overflow-auto max-h-[400px]">
          <SyntaxHighlighter
            style={theme === 'dark' ? oneDark : prism}
            language={language}
            PreTag="div"
            {...props}
            customStyle={{
              margin: 0,
              padding: '1rem',
              backgroundColor: theme === 'dark' ? 'rgba(15, 23, 42, 0.6)' : 'rgba(241, 245, 249, 0.6)',
            }}
            codeTagProps={{
                className: 'text-sm'
            }}
          >
            {codeText}
          </SyntaxHighlighter>
        </div>
      </div>
    );
  }

  return (
    <code className="bg-slate-100 dark:bg-slate-700/50 px-1.5 py-1 rounded-md text-sm font-mono" {...props}>
      {children}
    </code>
  );
};
