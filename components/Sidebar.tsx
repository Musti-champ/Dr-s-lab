import React from 'react';
import { NewChatIcon, SettingsIcon, SunIcon, MoonIcon, SpeakerWaveIcon, SpeakerXMarkIcon } from './icons';

interface SidebarProps {
  onNewChat: () => void;
  model: string;
  onModelChange: (model: string) => void;
  theme: string;
  toggleTheme: () => void;
  responseMode: 'text' | 'voice';
  toggleResponseMode: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onNewChat, model, onModelChange, theme, toggleTheme, responseMode, toggleResponseMode }) => {
  return (
    <aside className="hidden md:flex w-64 h-screen bg-slate-50 dark:bg-slate-900 flex-col justify-between p-4 border-r border-gray-200 dark:border-gray-700">
      <div>
        <div className="mb-6">
          <label htmlFor="model-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 px-2">
            Model
          </label>
          <select
            id="model-select"
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            aria-label="Select AI Model"
          >
            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            <option value="gemini-1.5-pro-latest">Gemini 1.5 Pro</option>
            <option value="gemini-1.0-pro">Gemini 1.0 Pro</option>
          </select>
        </div>

        <button 
          onClick={onNewChat} 
          className="w-full flex items-center p-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 dark:text-gray-300" 
          aria-label="New Chat"
          title="Start a new conversation"
        >
          <NewChatIcon className="w-5 h-5 mr-3" />
          <span className="font-medium">New Chat</span>
        </button>
      </div>
      
      <div className="space-y-2">
        <button
          onClick={toggleResponseMode}
          className="w-full flex items-center p-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 dark:text-gray-300"
          aria-label="Toggle voice output"
          title={`Switch to ${responseMode === 'text' ? 'voice' : 'text'} responses`}
        >
          {responseMode === 'text' ? <SpeakerXMarkIcon className="w-5 h-5 mr-3" /> : <SpeakerWaveIcon className="w-5 h-5 mr-3" />}
          <span className="font-medium">Voice Output</span>
        </button>
        <button
          onClick={toggleTheme}
          className="w-full flex items-center p-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 dark:text-gray-300"
          aria-label="Toggle theme"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <MoonIcon className="w-5 h-5 mr-3" /> : <SunIcon className="w-5 h-5 mr-3" />}
          <span className="font-medium">{theme === 'light' ? 'Dark' : 'Light'} Mode</span>
        </button>
        <button 
          className="w-full flex items-center p-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 dark:text-gray-300" 
          aria-label="Settings"
          title="View application settings"
        >
          <SettingsIcon className="w-5 h-5 mr-3" />
          <span className="font-medium">Settings</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;