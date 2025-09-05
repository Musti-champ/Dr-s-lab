import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GoogleGenAI, Type } from "@google/genai";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { 
    FileIcon, FolderIcon, StudioIcon, TerminalIcon, PlusIcon, CloseIcon,
    BugAntIcon, ComputerDesktopIcon, DocumentTextIcon, CheckIcon, ArrowPathIcon,
    ChevronRightIcon, ChevronDownIcon, FilePlusIcon, FolderPlusIcon, MagnifyingGlassIcon
} from './icons';


// --- TYPE DEFINITIONS ---
interface StudioMessageProps {
  content: string;
  theme: string;
}

interface StudioFile {
  path: string;
  language: string;
  content:string;
}

interface StudioContent {
  projectName: string;
  files: StudioFile[];
  explanation: string;
  terminalOutput: string;
}

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: TreeNode[];
}

type TabType = 'file' | 'terminal' | 'console' | 'debugger-report' | 'preview';

interface Tab {
    id: string;
    name: string;
    type: TabType;
    path?: string; // for file tabs
    content?: string; // for non-file tabs like debugger report
}

interface GitCommit {
    id: string;
    message: string;
    timestamp: string;
    author: string;
    files: string[];
}

// --- HELPER FUNCTIONS ---
const buildFileTree = (files: StudioFile[]): TreeNode[] => {
    const root: TreeNode = { name: 'root', path: '', type: 'folder', children: [] };

    files.forEach(file => {
        // Ignore placeholder files for empty directories in the final tree
        if (file.path.endsWith('/.gitkeep')) return;

        const parts = file.path.split('/');
        let currentNode = root;

        parts.forEach((part, index) => {
            const isFile = index === parts.length - 1;
            const currentPath = parts.slice(0, index + 1).join('/');
            let childNode = currentNode.children?.find(child => child.name === part && child.path === currentPath);


            if (!childNode) {
                childNode = {
                    name: part,
                    path: currentPath,
                    type: isFile ? 'file' : 'folder',
                };
                 if (!isFile) {
                    childNode.children = [];
                }
                currentNode.children?.push(childNode);
            }
            
            if (!isFile) {
                currentNode = childNode;
            }
        });
    });

    const sortNodes = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => {
        if (a.type === 'folder' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name);
      });
      nodes.forEach(node => {
        if (node.children) {
          sortNodes(node.children);
        }
      });
    };
    
    if (root.children) {
        sortNodes(root.children);
    }

    return root.children || [];
};

// --- SUB-COMPONENTS ---

// Forward declaration for recursive type
const FileTree: React.FC<{ 
    nodes: TreeNode[]; 
    onFileClick: (path: string, name: string) => void; 
    level?: number;
    expandedFolders: Set<string>;
    onToggleFolder: (path: string) => void;
}> = ({ nodes, onFileClick, level = 0, expandedFolders, onToggleFolder }) => (
    <div>
        {nodes.map(node => (
            <FileTreeNode key={node.path} node={node} onFileClick={onFileClick} level={level} expandedFolders={expandedFolders} onToggleFolder={onToggleFolder} />
        ))}
    </div>
);

const FileTreeNode: React.FC<{
  node: TreeNode;
  onFileClick: (path: string, name: string) => void;
  level: number;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
}> = ({ node, onFileClick, level, expandedFolders, onToggleFolder }) => {
  const isFolder = node.type === 'folder';
  const isExpanded = expandedFolders.has(node.path);

  const handleToggle = () => {
    if (isFolder) {
      onToggleFolder(node.path);
    } else {
      onFileClick(node.path, node.name);
    }
  };

  return (
    <div>
      <button
        onClick={handleToggle}
        className={`flex items-center space-x-1.5 py-1 w-full text-left rounded transition-colors duration-100 hover:bg-gray-100 dark:hover:bg-gray-700/50`}
        style={{ paddingLeft: `${level * 16}px` }}
        title={node.path}
      >
        {isFolder ? (
            <>
                {isExpanded ? <ChevronDownIcon className="w-3.5 h-3.5 flex-shrink-0" /> : <ChevronRightIcon className="w-3.5 h-3.5 flex-shrink-0" />}
                <FolderIcon className="w-4 h-4 text-yellow-500 dark:text-yellow-400 flex-shrink-0" />
            </>
        ) : (
            <FileIcon className="w-4 h-4 text-gray-500 flex-shrink-0 ml-[20px]" />
        )}
        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{node.name}</span>
      </button>
      {isFolder && isExpanded && node.children && (
        <FileTree nodes={node.children} onFileClick={onFileClick} level={level + 1} expandedFolders={expandedFolders} onToggleFolder={onToggleFolder} />
      )}
    </div>
  );
};

const CodeEditor: React.FC<{ content: string, language: string, onContentChange: (newContent: string) => void, theme: string }> = ({ content, language, onContentChange, theme }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const codeContainerRef = useRef<HTMLDivElement>(null);

    const syncScroll = () => {
        if (textareaRef.current && codeContainerRef.current) {
            codeContainerRef.current.scrollTop = textareaRef.current.scrollTop;
            codeContainerRef.current.scrollLeft = textareaRef.current.scrollLeft;
        }
    };
    
    const codeWithNewline = content.endsWith('\n') ? content : content + '\n';

    return (
        <div className={`relative w-full h-full font-mono text-sm ${theme === 'dark' ? 'bg-[#282c34]' : 'bg-gray-50'}`}>
            <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => onContentChange(e.target.value)}
                onScroll={syncScroll}
                className={`absolute inset-0 z-10 p-4 pl-16 resize-none border-0 bg-transparent text-transparent caret-current outline-none whitespace-pre-wrap break-normal ${theme === 'dark' ? 'text-white' : 'text-black'}`}
                spellCheck="false"
            />
            <div ref={codeContainerRef} className="overflow-auto h-full" aria-hidden="true">
                 <SyntaxHighlighter
                    style={theme === 'dark' ? oneDark : prism}
                    language={language}
                    showLineNumbers
                    wrapLines
                    lineNumberStyle={{ minWidth: '3.5em', paddingRight: '1.5em', textAlign: 'right', userSelect: 'none', color: theme === 'dark' ? '#888' : '#aaa' }}
                    PreTag="pre"
                    customStyle={{
                      margin: 0,
                      padding: '1rem',
                      backgroundColor: 'transparent',
                      minHeight: '100%',
                    }}
                    codeTagProps={{
                        style: {
                            fontFamily: 'inherit',
                            fontSize: 'inherit',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                        }
                    }}
                 >
                    {codeWithNewline}
                </SyntaxHighlighter>
            </div>
        </div>
    );
};

const SimulatedTerminal: React.FC<{ 
    initialOutput: string; 
    theme: string;
    files: Map<string, Omit<StudioFile, 'path'>>;
    onFilesUpdate: (files: Map<string, Omit<StudioFile, 'path'>>) => void;
    projectName: string;
}> = ({ initialOutput, theme, files, onFilesUpdate, projectName }) => {
    const [lines, setLines] = useState<(string | {command: string})[]>([initialOutput]);
    const [input, setInput] = useState('');
    const [cwd, setCwd] = useState('/');
    const [commandHistory, setCommandHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    
    // Git state
    const [isGitInitialized, setIsGitInitialized] = useState(false);
    const [stagedFiles, setStagedFiles] = useState<Set<string>>(new Set());
    const [commits, setCommits] = useState<GitCommit[]>([]);
    const [branches, setBranches] = useState(['main']);
    const [currentBranch, setCurrentBranch] = useState('main');

    const endOfTerminalRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        endOfTerminalRef.current?.scrollIntoView();
    }, [lines]);
    
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const resolvePath = (targetPath: string): string => {
        if (!targetPath) return cwd;
        const isAbsolute = targetPath.startsWith('/');
        const parts = (isAbsolute ? targetPath : `${cwd}/${targetPath}`).split('/').filter(p => p);
        const resolvedParts: string[] = [];
        for (const part of parts) {
            if (part === '..') {
                resolvedParts.pop();
            } else if (part !== '.') {
                resolvedParts.push(part);
            }
        }
        return `/${resolvedParts.join('/')}`;
    };

    const isDirectory = (path: string): boolean => {
        if (path === '/') return true;
        const normalizedPath = path.endsWith('/') ? path : `${path}/`;
        for (const p of files.keys()) {
            if (p.startsWith(normalizedPath)) return true;
        }
        return false;
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    }
    
    const handleInputKeydown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const parts = input.split(' ');
            const currentPart = parts[parts.length - 1];
            const commands = ['clear', 'help', 'ls', 'cd', 'cat', 'mkdir', 'rm', 'git'];

            if (parts.length === 1) { // Command completion
                const matchingCommands = commands.filter(cmd => cmd.startsWith(currentPart));
                if (matchingCommands.length === 1) {
                    setInput(matchingCommands[0] + ' ');
                }
            } else { // Path completion
                const pathPrefix = currentPart.substring(0, currentPart.lastIndexOf('/') + 1);
                const partialName = currentPart.substring(currentPart.lastIndexOf('/') + 1);
                const targetDir = resolvePath(pathPrefix || '.');
                
                const entries = new Set<string>();
                const dirPrefix = targetDir === '/' ? '' : `${targetDir.substring(1)}/`;
                for (const p of files.keys()) {
                    if (p.startsWith(dirPrefix)) {
                        const remaining = p.substring(dirPrefix.length);
                        const entry = remaining.split('/')[0] + (remaining.includes('/') ? '/' : '');
                        entries.add(entry);
                    }
                }
                
                const matchingEntries = Array.from(entries).filter(entry => entry.startsWith(partialName));
                if (matchingEntries.length === 1) {
                    const completedPath = pathPrefix + matchingEntries[0];
                    parts[parts.length - 1] = completedPath;
                    setInput(parts.join(' '));
                }
            }
        } else if (e.key === 'Enter' && input.trim()) {
            const fullCommand = input.trim();
            const newHistory = [fullCommand, ...commandHistory];
            setCommandHistory(newHistory);
            setHistoryIndex(-1);

            const [command, ...args] = fullCommand.split(/\s+/);
            let output: string | null = '';

            const newFiles = new Map(files);

            switch(command) {
                case 'clear':
                    setLines([]);
                    output = null;
                    break;
                case 'help':
                    output = 'Available commands: help, clear, ls, cd, cat, mkdir, rm, git';
                    break;
                case 'ls': {
                    const targetPath = resolvePath(args[0] || '.');
                    if (!isDirectory(targetPath)) {
                        output = `ls: ${args[0] || '.'}: No such file or directory`;
                        break;
                    }
                    const entries = new Set<string>();
                    const prefix = targetPath === '/' ? '' : `${targetPath.substring(1)}/`;
                    
                    for (const p of files.keys()) {
                        if (p.startsWith(prefix)) {
                            const remaining = p.substring(prefix.length);
                            const firstPart = remaining.split('/')[0];
                            if (remaining.includes('/')) {
                                entries.add(`${firstPart}/`);
                            } else {
                                entries.add(firstPart);
                            }
                        }
                    }
                    output = Array.from(entries).sort().join('\n');
                    break;
                }
                case 'cd': {
                    const targetPath = resolvePath(args[0] || '/');
                    if (isDirectory(targetPath)) {
                        setCwd(targetPath === '/' ? '/' : targetPath);
                        output = null;
                    } else {
                        output = `cd: ${args[0]}: No such file or directory`;
                    }
                    break;
                }
                case 'cat': {
                    if (!args[0]) {
                        output = 'usage: cat [filename]';
                        break;
                    }
                    const targetPath = resolvePath(args[0]);
                    const pathKey = targetPath.substring(1);
                    output = newFiles.get(pathKey)?.content ?? `cat: ${args[0]}: No such file or directory`;
                    break;
                }
                case 'mkdir': {
                    if (!args[0]) {
                        output = 'usage: mkdir [dirname]';
                        break;
                    }
                    const targetPath = resolvePath(args[0]);
                    const pathKey = `${targetPath.substring(1)}/.gitkeep`;
                    if (isDirectory(targetPath) || newFiles.has(pathKey)) {
                        output = `mkdir: ${args[0]}: File exists`;
                    } else {
                        newFiles.set(pathKey, { content: '', language: 'text' });
                        onFilesUpdate(newFiles);
                        output = null;
                    }
                    break;
                }
                case 'rm': {
                    if (!args[0]) {
                        output = 'usage: rm [file_or_directory]';
                        break;
                    }
                    const targetPath = resolvePath(args[0]);
                    const pathKey = targetPath.substring(1);
                    let found = false;

                    if (isDirectory(targetPath)) { // It's a directory
                        const dirPrefix = `${pathKey}/`;
                        for (const p of newFiles.keys()) {
                            if (p.startsWith(dirPrefix) || p === `${pathKey}/.gitkeep` || p === pathKey) {
                                newFiles.delete(p);
                                found = true;
                            }
                        }
                    } else if (newFiles.has(pathKey)) { // It's a file
                        newFiles.delete(pathKey);
                        found = true;
                    }

                    if (found) {
                        onFilesUpdate(newFiles);
                        output = null;
                    } else {
                        output = `rm: ${args[0]}: No such file or directory`;
                    }
                    break;
                }
                case 'git': {
                    const subCommand = args[0];
                    if (!isGitInitialized && subCommand !== 'init') {
                        output = "fatal: not a git repository (or any of the parent directories): .git";
                        break;
                    }
                    switch (subCommand) {
                        case 'init':
                            setIsGitInitialized(true);
                            output = 'Initialized empty Git repository.';
                            break;
                        case 'add':
                            const fileToAdd = args[1];
                            if (!fileToAdd) {
                                output = 'Nothing specified, nothing added.\nMaybe you wanted to say \'git add .\'?';
                                break;
                            }
                            const newStaged = new Set(stagedFiles);
                            if (fileToAdd === '.') {
                                files.forEach((_, path) => newStaged.add(path));
                                output = `Staged all ${files.size} files.`;
                            } else {
                                const resolvedFile = resolvePath(fileToAdd).substring(1);
                                if (files.has(resolvedFile)) {
                                    newStaged.add(resolvedFile);
                                    output = `Staged '${fileToAdd}'.`;
                                } else {
                                    output = `fatal: pathspec '${fileToAdd}' did not match any files`;
                                }
                            }
                            setStagedFiles(newStaged);
                            break;
                        case 'commit':
                            if (args[1] === '-m' && args[2]) {
                                if (stagedFiles.size === 0) {
                                    output = 'nothing to commit, working tree clean';
                                    break;
                                }
                                const message = args.slice(2).join(' ').replace(/"/g, '');
                                const newCommit: GitCommit = {
                                    id: Math.random().toString(36).substring(2, 9),
                                    message,
                                    author: 'User <user@example.com>',
                                    timestamp: new Date().toString(),
                                    files: Array.from(stagedFiles)
                                };
                                setCommits([newCommit, ...commits]);
                                setStagedFiles(new Set());
                                output = `[${currentBranch} (root-commit) ${newCommit.id}] ${message}\n ${newCommit.files.length} files changed`;
                            } else {
                                output = 'usage: git commit -m "commit message"';
                            }
                            break;
                        case 'log':
                            output = commits.map(c => 
                                `commit ${c.id} (HEAD -> ${currentBranch})\nAuthor: ${c.author}\nDate:   ${c.timestamp}\n\n\t${c.message}`
                            ).join('\n\n');
                             if (!output) output = 'No commits yet.';
                            break;
                        case 'branch':
                            output = branches.map(b => (b === currentBranch ? `* ${b}` : `  ${b}`)).join('\n');
                            break;
                        default:
                            output = `'git ${subCommand}' is not a git command. See 'git --help'.`;
                            break;
                    }
                    break;
                }
                default:
                    output = `command not found: ${command}`;
                    break;
            }

            const newLines: (string | {command: string})[] = [...lines, {command: fullCommand}];
            if (output !== null && output.trim().length > 0) {
                newLines.push(output);
            }
            setLines(newLines);
            setInput('');
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (commandHistory.length > 0) {
                const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
                setHistoryIndex(newIndex);
                setInput(commandHistory[newIndex] || '');
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex > -1) {
                const newIndex = Math.max(historyIndex - 1, -1);
                setHistoryIndex(newIndex);
                setInput(newIndex === -1 ? '' : commandHistory[newIndex] || '');
            }
        }
    }
    
    const gitBranch = isGitInitialized ? ` (${currentBranch})` : '';
    const promptPrefix = `[${projectName}${gitBranch}:${cwd === '/' ? '' : '~'}${cwd === '/' ? '' : cwd}]$`;

    return (
        <div className={`w-full h-full p-4 font-mono text-sm overflow-y-auto ${theme === 'dark' ? 'bg-gray-900 text-gray-300' : 'bg-gray-50 text-gray-800'}`} onClick={() => inputRef.current?.focus()}>
           {lines.map((line, i) => (
               <div key={i}>
                   {typeof line === 'object' && 'command' in line ? (
                       <div className="flex items-center">
                           <span className="text-blue-400 mr-2 flex-shrink-0">{promptPrefix}</span>
                           <span>{line.command}</span>
                       </div>
                   ) : (
                       <pre className="whitespace-pre-wrap">{line}</pre>
                   )}
               </div>
           ))}
            <div className="flex items-center">
               <span className="text-blue-400 mr-2 flex-shrink-0">{promptPrefix}</span>
               <input 
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleInputKeydown}
                    className="flex-1 bg-transparent focus:outline-none"
                    spellCheck="false"
               />
            </div>
            <div ref={endOfTerminalRef} />
        </div>
    );
};

const LivePreview: React.FC<{ files: Map<string, Omit<StudioFile, 'path'>> }> = ({ files }) => {
    const [iframeSrcDoc, setIframeSrcDoc] = useState('<html><body style="color: #ccc; font-family: sans-serif; padding: 2rem;">Loading preview...</body></html>');
    const [isGenerating, setIsGenerating] = useState(false);

    const generateSrcDoc = useCallback(() => {
        setIsGenerating(true);
        const htmlFile = files.get('index.html');
        if (!htmlFile?.content) {
            setIframeSrcDoc('<html><body style="color: #ccc; font-family: sans-serif; padding: 2rem;">No index.html file found in the project.</body></html>');
            setIsGenerating(false);
            return;
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlFile.content, 'text/html');

        const babelScript = doc.createElement('script');
        babelScript.src = 'https://unpkg.com/@babel/standalone@7.24.7/babel.min.js';
        doc.head.prepend(babelScript);

        const fileMap = new Map(Array.from(files.entries()).map(([path, data]) => [path.startsWith('./') ? path.substring(2) : path, data]));

        doc.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
            const href = link.getAttribute('href')?.replace(/^\.\//, '');
            if (href && fileMap.has(href)) {
                const style = doc.createElement('style');
                style.textContent = fileMap.get(href)!.content;
                link.replaceWith(style);
            }
        });

        doc.querySelectorAll<HTMLScriptElement>('script[src]').forEach(script => {
            const src = script.getAttribute('src')?.replace(/^\.\//, '');
            if (src && fileMap.has(src)) {
                const newScript = doc.createElement('script');
                newScript.textContent = fileMap.get(src)!.content;
                newScript.setAttribute('type', 'text/babel');
                if (script.type === 'module') {
                    newScript.setAttribute('data-type', 'module');
                }
                script.replaceWith(newScript);
            }
        });
        
        const existingScripts = doc.querySelectorAll('script:not([src])');
        existingScripts.forEach(script => {
           if(script.textContent?.includes('React') || script.textContent?.includes('jsx')) {
               script.setAttribute('type', 'text/babel');
           }
        });

        const serializer = new XMLSerializer();
        setIframeSrcDoc(serializer.serializeToString(doc));
        setIsGenerating(false);

    }, [files]);

    useEffect(() => {
        const timeoutId = setTimeout(generateSrcDoc, 500); // Debounce
        return () => clearTimeout(timeoutId);
    }, [generateSrcDoc]);

    return (
        <div className="w-full h-full flex flex-col bg-white">
            <div className="flex-shrink-0 p-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-end bg-gray-50 dark:bg-gray-800/50">
                <button onClick={generateSrcDoc} disabled={isGenerating} className="flex items-center space-x-2 px-3 py-1 bg-gray-200 dark:bg-gray-600 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50">
                    <ArrowPathIcon className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                </button>
            </div>
            <iframe
                srcDoc={iframeSrcDoc}
                title="Live Preview"
                className="w-full h-full border-0"
                sandbox="allow-scripts"
            />
        </div>
    );
};

const PostDebugPrompt: React.FC<{
  onRerun: () => void;
  onPreview: () => void;
  onClose: () => void;
}> = ({ onRerun, onPreview, onClose }) => {
  return (
    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity animate-fade-in">
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md text-center transform transition-all animate-scale-in">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900">
          <CheckIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mt-4">Fixes Applied Successfully!</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          The AI has updated the project files. What would you like to do next?
        </p>
        <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
          <button onClick={onRerun} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:ring-offset-gray-800">
            <BugAntIcon className="w-4 h-4" />
            <span>Re-run Debugger</span>
          </button>
          <button onClick={onPreview} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-transparent bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:ring-offset-gray-800">
            <ComputerDesktopIcon className="w-4 h-4" />
            <span>Preview Changes</span>
          </button>
        </div>
         <button onClick={onClose} className="absolute top-2 right-2 p-1.5 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
          <CloseIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};


// --- MAIN COMPONENT ---
export const StudioMessage: React.FC<StudioMessageProps> = ({ content, theme }) => {
    const [projectName, setProjectName] = useState('');
    const [localFiles, setLocalFiles] = useState<Map<string, Omit<StudioFile, 'path'>>>(new Map());
    const [openTabs, setOpenTabs] = useState<Tab[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);
    const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
    const [isDebugging, setIsDebugging] = useState(false);
    const [showPostDebugPrompt, setShowPostDebugPrompt] = useState(false);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    const initialFilesRef = useRef<Map<string, Omit<StudioFile, 'path'>>>(new Map());
    const addMenuRef = useRef<HTMLDivElement>(null);
    const createMenuRef = useRef<HTMLDivElement>(null);
    
    const parsedContent: StudioContent | null = useMemo(() => {
        try {
            const cleanContent = content.replace(/^```json\n?/, '').replace(/\n?```$/, '');
            return JSON.parse(cleanContent);
        } catch (e) {
            console.error("Failed to parse StudioMessage content:", e);
            return null;
        }
    }, [content]);

    const fileTree = useMemo(() => {
        const filesArray = Array.from(localFiles.entries()).map(([path, data]) => ({
            path,
            content: data.content,
            language: data.language,
        }));
        return buildFileTree(filesArray);
    }, [localFiles]);

    useEffect(() => {
        if (parsedContent) {
            const readmeFile = { path: 'README.md', language: 'markdown', content: parsedContent.explanation };
            const allFiles = [...parsedContent.files, readmeFile];
            const newFilesMap = new Map(allFiles.map(f => [f.path, { content: f.content, language: f.language }]));
            
            setLocalFiles(newFilesMap);
            initialFilesRef.current = new Map(newFilesMap); // Store initial state for change detection
            setProjectName(parsedContent.projectName || 'New Project');
            
            const readmeTab: Tab = { id: 'file-README.md', name: 'README.md', type: 'file', path: 'README.md' };
            setOpenTabs([readmeTab]);
            setActiveTabId(readmeTab.id);

            const initialTree = buildFileTree(allFiles);
            const initialExpanded = new Set<string>();
            const expandAll = (nodes: TreeNode[]) => {
                nodes.forEach(node => {
                    if (node.type === 'folder') {
                        initialExpanded.add(node.path);
                        if (node.children) expandAll(node.children);
                    }
                });
            };
            expandAll(initialTree);
            setExpandedFolders(initialExpanded);
        }
    }, [parsedContent]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
          if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) setIsAddMenuOpen(false);
          if (createMenuRef.current && !createMenuRef.current.contains(event.target as Node)) setIsCreateMenuOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleToggleFolder = (path: string) => {
        setExpandedFolders(prev => {
            const newSet = new Set(prev);
            if (newSet.has(path)) {
                newSet.delete(path);
            } else {
                newSet.add(path);
            }
            return newSet;
        });
    };

    const handleOpenFile = (path: string, name: string) => {
        const tabId = `file-${path}`;
        if (!openTabs.some(tab => tab.id === tabId)) {
            setOpenTabs(prev => [...prev, { id: tabId, name, type: 'file', path }]);
        }
        setActiveTabId(tabId);
    };

    const handleCloseTab = (tabIdToClose: string) => {
        const tabToClose = openTabs.find(t => t.id === tabIdToClose);

        if (tabToClose?.type === 'file' && tabToClose.path) {
            const initialContent = initialFilesRef.current.get(tabToClose.path)?.content;
            const currentContent = localFiles.get(tabToClose.path)?.content;
            if (initialContent !== currentContent) {
                if (!window.confirm(`You have unsaved changes in ${tabToClose.name}. Are you sure you want to close and discard the changes for this session?`)) {
                    return; // User cancelled
                }
                 // Revert changes on discard
                setLocalFiles(prev => new Map(prev).set(tabToClose.path!, { ...prev.get(tabToClose.path!)!, content: initialContent! }));
            }
        }
        
        const tabIndex = openTabs.findIndex(tab => tab.id === tabIdToClose);
        const newTabs = openTabs.filter(tab => tab.id !== tabIdToClose);
        setOpenTabs(newTabs);

        if (activeTabId === tabIdToClose) {
            if (newTabs.length > 0) {
                const newActiveIndex = Math.max(0, tabIndex - 1);
                setActiveTabId(newTabs[newActiveIndex].id);
            } else {
                setActiveTabId(null);
            }
        }
    };
    
    const handleAddTab = (type: TabType) => {
        let newTab: Tab;
        if (type === 'preview') {
            const existingPreview = openTabs.find(t => t.type === 'preview');
            if (existingPreview) {
                setActiveTabId(existingPreview.id);
                setIsAddMenuOpen(false);
                return;
            }
            newTab = { id: `preview-${Date.now()}`, name: 'Live Preview', type: 'preview' };
        } else {
            const newId = `${type}-${Date.now()}`;
            const name = type.charAt(0).toUpperCase() + type.slice(1);
            newTab = { id: newId, name, type };
        }
        
        setOpenTabs(prev => [...prev, newTab]);
        setActiveTabId(newTab.id);
        setIsAddMenuOpen(false);
    }
    
    const handleRunDebugger = async () => {
        setIsAddMenuOpen(false);
        setIsDebugging(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const filesForPrompt = Array.from(localFiles.entries())
              .filter(([path]) => path !== 'README.md' && !path.endsWith('.gitkeep'))
              .map(([path, data]) => ({ path, ...data }));

            const debugPrompt = `Analyze the following project files, identify any bugs, errors, or potential improvements. 
            Provide a markdown report of the issues and the fixed code for each file that needs changes.
            Project: ${projectName}
            Files:
            ${JSON.stringify(filesForPrompt, null, 2)}`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: debugPrompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            report: { 
                                type: Type.STRING,
                                description: "A markdown-formatted report of all issues found and fixes applied."
                            },
                            fixedFiles: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        path: { type: Type.STRING },
                                        language: { type: Type.STRING },
                                        content: { type: Type.STRING }
                                    },
                                    required: ["path", "language", "content"]
                                }
                            }
                        },
                        required: ["report", "fixedFiles"]
                    }
                }
            });
            
            const result = JSON.parse(response.text);
            const reportId = `debugger-report-${Date.now()}`;
            const reportTab: Tab = {
                id: reportId,
                name: "Debugger Report",
                type: 'debugger-report',
                content: JSON.stringify({ report: result.report, fixedFiles: result.fixedFiles })
            };
            setOpenTabs(prev => [...prev, reportTab]);
            setActiveTabId(reportId);

        } catch (error) {
            console.error("Debugger failed:", error);
            alert("The AI debugger encountered an error. Please try again.");
        } finally {
            setIsDebugging(false);
        }
    };

    const handleApplyFixes = (reportContent: string) => {
        try {
            const { fixedFiles } = JSON.parse(reportContent);
            if (fixedFiles && Array.isArray(fixedFiles)) {
                setLocalFiles(prevFiles => {
                    const newFiles = new Map(prevFiles);
                    fixedFiles.forEach((file: StudioFile) => {
                        newFiles.set(file.path, { content: file.content, language: file.language });
                    });
                    // After applying fixes, update the "saved" state to this new version
                    initialFilesRef.current = new Map(newFiles);
                    return newFiles;
                });
                
                const reportTab = openTabs.find(t => t.type === 'debugger-report' && t.content === reportContent);
                if(reportTab) handleCloseTab(reportTab.id);
                setShowPostDebugPrompt(true);
            }
        } catch (error) {
             console.error("Failed to apply fixes:", error);
             alert("Could not apply fixes due to an error.");
        }
    }
    
    const handleRerunDebugger = () => {
        setShowPostDebugPrompt(false);
        handleRunDebugger();
    }

    const handlePreviewChanges = () => {
        setShowPostDebugPrompt(false);
        handleAddTab('preview');
    }
    
    const handleCreateNew = (type: 'file' | 'folder') => {
        setIsCreateMenuOpen(false);
        const promptMessage = `Enter the name for the new ${type} (e.g., 'src/components/Button.js' or 'new-folder'):`;
        const path = prompt(promptMessage);
        if (path) {
            setLocalFiles(prevFiles => {
                const newFiles = new Map(prevFiles);
                if (type === 'file') {
                    if (newFiles.has(path)) {
                        alert('A file with this name already exists.');
                        return prevFiles;
                    }
                    const lang = path.split('.').pop() ?? 'text';
                    newFiles.set(path, { content: '', language: lang });
                    // Also update initial state for new files
                    initialFilesRef.current.set(path, { content: '', language: lang });
                    handleOpenFile(path, path.split('/').pop()!);
                } else {
                    const folderPath = path.endsWith('/') ? path : `${path}/`;
                    const placeholder = `${folderPath}.gitkeep`;
                    if (newFiles.has(placeholder)) {
                        alert('A folder with this name already exists.');
                        return prevFiles;
                    }
                    newFiles.set(placeholder, { content: '', language: 'text' });
                    // Also update initial state for new folders
                    initialFilesRef.current.set(placeholder, { content: '', language: 'text' });
                    setExpandedFolders(prev => new Set(prev).add(path)); // expand new folder
                }
                return newFiles;
            });
        }
    };
    
    const filterFileTree = useCallback((nodes: TreeNode[], query: string): TreeNode[] => {
        if (!query) return nodes;

        const lowerCaseQuery = query.toLowerCase();
        
        return nodes.reduce((acc, node) => {
            if (node.name.toLowerCase().includes(lowerCaseQuery)) {
                acc.push(node);
                return acc;
            }

            if (node.type === 'folder' && node.children) {
                const filteredChildren = filterFileTree(node.children, query);
                if (filteredChildren.length > 0) {
                    acc.push({ ...node, children: filteredChildren });
                }
            }
            
            return acc;
        }, [] as TreeNode[]);
    }, []);

    const displayedFileTree = useMemo(() => filterFileTree(fileTree, searchQuery), [fileTree, searchQuery, filterFileTree]);

    const activeTab = openTabs.find(tab => tab.id === activeTabId);

    if (!parsedContent) {
        return (
            <div className="w-full max-w-4xl mx-auto my-2 p-4 rounded-lg bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700">
                <p className="text-red-800 dark:text-red-200 font-medium">Error displaying Studio response.</p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">The AI returned a response that was not in the expected format.</p>
            </div>
        );
    }

  return (
    <div className="relative w-full max-w-6xl mx-auto my-2 space-y-4 text-gray-800 dark:text-gray-200">
        <div className="flex items-center space-x-3 p-3 rounded-lg bg-indigo-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <StudioIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-bold">{projectName}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-10 gap-4 h-[70vh]">
            {/* File Explorer */}
            <div className="md:col-span-2 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-3 flex flex-col">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-700 mb-2 px-1">
                    <h3 className="text-sm font-semibold">Explorer</h3>
                    <div className="relative" ref={createMenuRef}>
                        <button onClick={() => setIsCreateMenuOpen(p => !p)} title="New File or Folder" className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                           <PlusIcon className="w-4 h-4" />
                        </button>
                         {isCreateMenuOpen && (
                            <div className="absolute top-full right-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-md shadow-lg border dark:border-gray-700 z-10 py-1">
                                <button onClick={() => handleCreateNew('file')} className="w-full flex items-center space-x-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                                    <FilePlusIcon className="w-4 h-4"/><span>New File</span>
                                </button>
                                <button onClick={() => handleCreateNew('folder')} className="w-full flex items-center space-x-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                                    <FolderPlusIcon className="w-4 h-4"/><span>New Folder</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                <div className="relative mb-2">
                    <input
                        type="search"
                        placeholder="Search files..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-2 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 border border-transparent rounded-md focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-gray-800"
                    />
                    <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500"/>
                </div>
                <div className="overflow-y-auto flex-1">
                    <FileTree nodes={displayedFileTree} onFileClick={handleOpenFile} expandedFolders={expandedFolders} onToggleFolder={handleToggleFolder} />
                </div>
            </div>

            {/* Editor & Tabs */}
            <div className="md:col-span-8 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
                <div className="flex items-center border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex-shrink-0">
                    <div className="flex-1 flex items-center overflow-x-auto">
                        {openTabs.map(tab => {
                            const isDirty = tab.type === 'file' && tab.path && initialFilesRef.current.get(tab.path)?.content !== localFiles.get(tab.path)?.content;
                            return (
                            <button 
                                key={tab.id}
                                onClick={() => setActiveTabId(tab.id)}
                                className={`flex items-center space-x-2 px-4 py-2 text-sm border-r border-gray-200 dark:border-gray-700 ${activeTabId === tab.id ? 'bg-white dark:bg-gray-800' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}
                            >
                                <span className={`truncate ${isDirty ? 'italic' : ''}`}>{tab.name}</span>
                                <CloseIcon onClick={(e) => {e.stopPropagation(); handleCloseTab(tab.id)}} className="w-3.5 h-3.5 hover:text-red-500"/>
                            </button>
                        )})}
                    </div>
                    <div className="relative" ref={addMenuRef}>
                        <button onClick={() => setIsAddMenuOpen(p => !p)} className="p-2 border-l border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700">
                            <PlusIcon className="w-4 h-4" />
                        </button>
                        {isAddMenuOpen && (
                            <div className="absolute top-full right-0 mt-1 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg border dark:border-gray-700 z-10 py-1">
                                <button onClick={() => handleAddTab('preview')} className="w-full flex items-center space-x-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                                    <ComputerDesktopIcon className="w-4 h-4"/><span>Live Preview</span>
                                </button>
                                <button onClick={() => handleAddTab('terminal')} className="w-full flex items-center space-x-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                                    <TerminalIcon className="w-4 h-4"/><span>New Terminal</span>
                                </button>
                                <div className="my-1 border-t border-gray-100 dark:border-gray-700"></div>
                                <button onClick={handleRunDebugger} disabled={isDebugging} className="w-full flex items-center space-x-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50">
                                    <BugAntIcon className={`w-4 h-4 ${isDebugging ? 'animate-spin' : ''}`}/><span>{isDebugging ? 'Debugging...' : 'Run AI Debugger'}</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex-1 overflow-auto bg-gray-50 dark:bg-[#282c34]">
                     {!activeTab && <div className="p-8 text-center text-gray-500">Open a file or create a new tab to get started.</div>}
                     {activeTab?.type === 'file' && activeTab.path && (
                         <CodeEditor 
                            content={localFiles.get(activeTab.path)?.content ?? ''}
                            language={localFiles.get(activeTab.path)?.language ?? 'text'}
                            onContentChange={(newContent) => {
                                setLocalFiles(prev => new Map(prev).set(activeTab.path!, { content: newContent, language: localFiles.get(activeTab.path!)!.language }));
                            }}
                            theme={theme}
                         />
                     )}
                     {activeTab?.type === 'terminal' && (
                         <SimulatedTerminal 
                            initialOutput={parsedContent.terminalOutput} 
                            theme={theme}
                            files={localFiles}
                            onFilesUpdate={setLocalFiles}
                            projectName={projectName}
                         />
                     )}
                     {activeTab?.type === 'preview' && (
                        <LivePreview files={localFiles} />
                     )}
                      {activeTab?.type === 'console' && (
                         <div className="p-4 font-mono text-sm">Console is ready.</div>
                     )}
                     {activeTab?.type === 'debugger-report' && activeTab.content && (
                         <div className="p-4 overflow-y-auto h-full bg-white dark:bg-gray-800">
                            <div className="flex items-center justify-between pb-2 mb-2 border-b dark:border-gray-700">
                                <h3 className="font-bold flex items-center space-x-2"><DocumentTextIcon className="w-5 h-5"/><span>Debugger Report</span></h3>
                                <button onClick={() => handleApplyFixes(activeTab.content!)} className="flex items-center space-x-2 px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700">
                                    <CheckIcon className="w-4 h-4" />
                                    <span>Apply Fixes</span>
                                </button>
                            </div>
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {JSON.parse(activeTab.content).report}
                                </ReactMarkdown>
                            </div>
                         </div>
                     )}
                </div>
            </div>
        </div>

        {showPostDebugPrompt && (
            <PostDebugPrompt
                onRerun={handleRerunDebugger}
                onPreview={handlePreviewChanges}
                onClose={() => setShowPostDebugPrompt(false)}
            />
        )}
    </div>
  );
};
