import React from 'react';
import { SparkleIcon, CloseIcon } from './icons';

interface TopBannerProps {
  onClose: () => void;
}

const TopBanner: React.FC<TopBannerProps> = ({ onClose }) => {
  return (
    <div className="w-full bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 flex items-center justify-between gap-4 px-2 sm:px-4 py-2 border-b border-gray-200 dark:border-gray-700 shrink-0">
      <div className="flex items-center sm:justify-center flex-1 min-w-0">
        <SparkleIcon className="w-4 h-4 text-orange-400 mr-2 shrink-0" />
        <span className="text-left sm:text-center">
          NEW!{' '}
          <a href="#" className="underline hover:text-gray-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded">
            Try image editing
          </a>{' '}
          with our best image model, Nano Banana
        </span>
      </div>
      <button
        onClick={onClose}
        className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500"
        aria-label="Dismiss banner"
      >
        <CloseIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
      </button>
    </div>
  );
};

export default TopBanner;