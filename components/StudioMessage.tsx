import React, { useState, useEffect, useMemo } from 'react';
import { CodeBlock } from './CodeBlock';
import { 
    FileIcon, FolderIcon, StudioIcon, GitHubIcon, GoogleDriveIcon, VercelIcon, FirebaseIcon, 
    SupabaseIcon, LinkIcon, TerminalIcon, FolderPlusIcon, FilePlusIcon, CheckIcon 
} from './icons';

// --- TYPE DEFINITIONS ---
interface StudioMessageProps {
  content: string;
  theme: string;
}

interface StudioFile {
  path: string;
  language: string;
  content: string;
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

// --- HELPER FUNCTIONS ---
const buildFileTree = (files: StudioFile[]): TreeNode[] => {
    const root: { [key: string]: TreeNode } = {};

    files.forEach(file => {
        let currentLevel = root;
        const parts = file.path.split('/');
        
        parts.forEach((part, index) => {
            if (!currentLevel[part]) {
                const isFile = index === parts.length - 1;
                const path = parts.slice(0, index + 1).join('/');
                currentLevel[part] = {
                    name: part,
                    path: path,
                    type: isFile ? 'file' : 'folder',
                    children: isFile ? undefined : [],
                };
            }
            if(currentLevel[part].type === 'folder') {
                // Descend into the tree, ensuring children array exists
                const childrenMap: { [key: string]: TreeNode } = (currentLevel[part].children || []).reduce((acc, child) => {
                    acc[child.name] = child;
                    return acc;
                }, {} as { [key: string]: TreeNode });
                currentLevel = childrenMap;
            }
        });
    });
    
    // Convert the root map to a sorted array
    const tree = Object.values(root);
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
    sortNodes(tree);
    return tree;
};


// --- SUB-COMPONENTS ---
const FileTree: React.FC<{ 
    nodes: TreeNode[]; 
    activePath: string; 
    onFileClick: (path: string) => void; 
    level?: number;
}> = ({ nodes, activePath, onFileClick, level = 0 }) => (
    <div>
        {nodes.map(node => (
            <div key={node.path} style={{ paddingLeft: `${level * 16}px` }}>
                <button
                    onClick={() => node.type === 'file' && onFileClick(node.path)}
                    disabled={node.type === 'folder'}
                    className={`flex items-center space-x-2 py-1 w-full text-left rounded ${
                        node.path === activePath ? 'bg-indigo-100 dark:bg-indigo-900/50' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'
                    } ${node.type === 'folder' ? 'cursor-default' : ''}`}
                >
                    {node.type === 'folder' 
                        ? <FolderIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        : <FileIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    }
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{node.name}</span>
                </button>
                {node.children && <FileTree nodes={node.children} activePath={activePath} onFileClick={onFileClick} level={level + 1} />}
            </div>
        ))}
    </div>
);

const IntegrationButton: React.FC<{
    Icon: React.ElementType;
    name: string;
    isConnected: boolean;
    onConnect: () => void;
    children?: React.ReactNode;
}> = ({ Icon, name, isConnected, onConnect, children }) => (
    <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
                <Icon className="w-6 h-6" />
                <span className="font-semibold text-gray-800 dark:text-gray-200">{name}</span>
            </div>
            {!isConnected && (
                <button onClick={onConnect} className="flex items-center space-x-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                    <LinkIcon className="w-4 h-4" />
                    <span>Connect</span>
                </button>
            )}
            {isConnected && (
                 <div className="flex items-center space-x-2 text-sm font-medium text-green-600 dark:text-green-400">
                    <CheckIcon className="w-4 h-4" />
                    <span>Connected</span>
                </div>
            )}
        </div>
        {isConnected && children && <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">{children}</div>}
    </div>
);

// --- MAIN COMPONENT ---
export const StudioMessage: React.FC<StudioMessageProps> = ({ content, theme }) => {
    const [activeTab, setActiveTab] = useState<'explanation' | 'terminal'>('explanation');
    const [activePath, setActivePath] = useState<string>('');
    const [fileTree, setFileTree] = useState<TreeNode[]>([]);
    const [filesMap, setFilesMap] = useState<Map<string, Omit<StudioFile, 'path'>>>(new Map());
    const [projectName, setProjectName] = useState('');
    
    // Integrations State
    const [connections, setConnections] = useState({
        github: false,
        googleDrive: false,
        vercel: false,
        firebase: false,
        supabase: false
    });

    const parsedContent: StudioContent | null = useMemo(() => {
        try {
            const cleanContent = content.replace(/^```json\n?/, '').replace(/\n?```$/, '');
            return JSON.parse(cleanContent);
        } catch (e) {
            console.error("Failed to parse StudioMessage content:", e);
            return null;
        }
    }, [content]);

    useEffect(() => {
        if (parsedContent) {
            const newFileTree = buildFileTree(parsedContent.files);
            const newFilesMap = new Map(parsedContent.files.map(f => [f.path, { content: f.content, language: f.language }]));
            
            setFileTree(newFileTree);
            setFilesMap(newFilesMap);
            setProjectName(parsedContent.projectName || 'New Project');
            if (parsedContent.files.length > 0) {
                setActivePath(parsedContent.files[0].path);
            }
        }
    }, [parsedContent]);

    const handleAddNew = (type: 'file' | 'folder') => {
        const name = window.prompt(`Enter new ${type} name:`);
        if(name) {
            // This is a simplified implementation that adds to the root.
            const newPath = name;
            if (filesMap.has(newPath)) {
                alert(`${type} already exists!`);
                return;
            }
            const newNode: TreeNode = { name, path: newPath, type };
            if (type === 'folder') newNode.children = [];
            
            setFileTree(prevTree => [...prevTree, newNode]);
            if (type === 'file') {
                setFilesMap(prevMap => new Map(prevMap).set(newPath, { content: `// New file: ${name}`, language: 'plaintext'}));
                setActivePath(newPath);
            }
        }
    }
    
    const activeFile = filesMap.get(activePath);

    if (!parsedContent) {
        return (
            <div className="w-full max-w-4xl mx-auto my-2 p-4 rounded-lg bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700">
                <p className="text-red-800 dark:text-red-200 font-medium">Error displaying Studio response.</p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">The AI returned a response that was not in the expected format.</p>
            </div>
        );
    }

  return (
    <div className="w-full max-w-4xl mx-auto my-2 space-y-4 text-gray-800 dark:text-gray-200">
        <div className="flex items-center space-x-3 p-3 rounded-lg bg-indigo-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <StudioIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-bold">{projectName}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* File Explorer */}
            <div className="md:col-span-1 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-semibold">Explorer</h3>
                    <div className="flex items-center space-x-1">
                        <button onClick={() => handleAddNew('file')} title="New File" className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"><FilePlusIcon className="w-4 h-4" /></button>
                        <button onClick={() => handleAddNew('folder')} title="New Folder" className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"><FolderPlusIcon className="w-4 h-4" /></button>
                    </div>
                </div>
                <div className="max-h-96 overflow-y-auto">
                    <FileTree nodes={fileTree} activePath={activePath} onFileClick={setActivePath} />
                </div>
            </div>

            {/* Editor & Info */}
            <div className="md:col-span-3 space-y-4">
                 <div className="bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden min-h-[300px]">
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center space-x-2 bg-gray-50 dark:bg-gray-800">
                        <FileIcon className="w-4 h-4" />
                        <span className="text-sm font-medium">{activePath || "Select a file"}</span>
                    </div>
                    {activeFile ? (
                        <CodeBlock theme={theme} className={`language-${activeFile.language}`}>
                            {activeFile.content}
                        </CodeBlock>
                    ) : (
                        <div className="p-4 text-center text-gray-500">Select a file from the explorer to view its code.</div>
                    )}
                 </div>
                 <div className="bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                     <div className="flex border-b border-gray-200 dark:border-gray-700">
                         <button onClick={() => setActiveTab('explanation')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'explanation' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Explanation</button>
                         <button onClick={() => setActiveTab('terminal')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'terminal' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Terminal</button>
                     </div>
                     <div className="p-4 max-h-60 overflow-y-auto">
                        {activeTab === 'explanation' && <div className="prose prose-sm max-w-none dark:prose-invert">{parsedContent.explanation}</div>}
                        {activeTab === 'terminal' && <CodeBlock theme={theme} className="language-bash">{parsedContent.terminalOutput}</CodeBlock>}
                     </div>
                 </div>
            </div>
        </div>
        
        {/* Integrations */}
        <div className="space-y-4">
             <h3 className="text-lg font-bold border-b border-gray-200 dark:border-gray-700 pb-2">Integrations & Deployment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 <IntegrationButton Icon={GitHubIcon} name="GitHub" isConnected={connections.github} onConnect={() => setConnections(p => ({...p, github: true}))}>
                    <div className="space-y-2">
                        <input type="text" placeholder="Commit message..." className="w-full bg-white dark:bg-gray-700 text-sm p-2 rounded border border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-indigo-500" />
                        <button className="w-full text-center bg-gray-800 text-white text-sm font-semibold p-2 rounded hover:bg-gray-700">Commit & Push</button>
                    </div>
                 </IntegrationButton>
                 <IntegrationButton Icon={GoogleDriveIcon} name="Google Drive" isConnected={connections.googleDrive} onConnect={() => setConnections(p => ({...p, googleDrive: true}))}>
                    <div className="flex items-center space-x-2">
                        <button className="flex-1 text-center bg-blue-600 text-white text-sm font-semibold p-2 rounded hover:bg-blue-500">Save to Drive</button>
                        <button className="flex-1 text-center bg-gray-200 dark:bg-gray-600 text-sm font-semibold p-2 rounded hover:bg-gray-300 dark:hover:bg-gray-500">Load from Drive</button>
                    </div>
                 </IntegrationButton>
                 <IntegrationButton Icon={VercelIcon} name="Vercel" isConnected={connections.vercel} onConnect={() => setConnections(p => ({...p, vercel: true}))}>
                    <button className="w-full text-center bg-black text-white text-sm font-semibold p-2 rounded hover:bg-gray-800">Deploy Project</button>
                 </IntegrationButton>
                 <IntegrationButton Icon={FirebaseIcon} name="Firebase" isConnected={connections.firebase} onConnect={() => setConnections(p => ({...p, firebase: true}))}>
                     <button className="w-full text-center bg-yellow-500 text-white text-sm font-semibold p-2 rounded hover:bg-yellow-400">Deploy Project</button>
                 </IntegrationButton>
                 <IntegrationButton Icon={SupabaseIcon} name="Supabase" isConnected={connections.supabase} onConnect={() => setConnections(p => ({...p, supabase: true}))}>
                     <button className="w-full text-center bg-green-600 text-white text-sm font-semibold p-2 rounded hover:bg-green-500">Deploy Project</button>
                 </IntegrationButton>
            </div>
        </div>
    </div>
  );
};
