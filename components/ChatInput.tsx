import React, { useState, useRef, useEffect } from 'react';
import { 
    PlusIcon, ToolsIcon, SendIcon, CloseIcon, StudioIcon, ResearchIcon, ImageIcon, 
    VideoIcon, MusicIcon, LearningIcon, ConsultIcon, MicrophoneIcon
} from './icons';

interface ChatInputProps {
    onSend: (prompt: string) => void;
    disabled?: boolean;
    isConversationMode?: boolean;
    autoListenTrigger?: number;
}

const tools = [
  { 
    name: 'Studio', 
    description: 'Workspace for development, GitHub integration, and CI/CD.', 
    icon: StudioIcon 
  },
  { 
    name: 'Deep Research', 
    description: 'Conduct in-depth research on any topic.', 
    icon: ResearchIcon 
  },
  { 
    name: 'Create Images', 
    description: 'Generate high-quality images from text descriptions.', 
    icon: ImageIcon 
  },
  { 
    name: 'Create Videos', 
    description: 'Create videos from text prompts or images.', 
    icon: VideoIcon 
  },
  { 
    name: 'Create Music', 
    description: 'Compose original music in various genres.', 
    icon: MusicIcon 
  },
  { 
    name: 'Guided Learning', 
    description: 'Receive personalized tutoring on any subject.', 
    icon: LearningIcon 
  },
  { 
    name: 'Consult Dr', 
    description: 'Synchronize for personalized assistance in your daily life.', 
    icon: ConsultIcon 
  },
];

const CONVERSATION_MODE_SEND_DELAY = 1200; // ms

const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled = false, isConversationMode = false, autoListenTrigger = 0 }) => {
  const [prompt, setPrompt] = useState('');
  const [isToolMenuOpen, setIsToolMenuOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isProcessingSpeech, setIsProcessingSpeech] = useState(false);
  const [isMicSupported, setIsMicSupported] = useState(true);
  const [micError, setMicError] = useState<string | null>(null);

  const finalTranscriptRef = useRef('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const toolMenuRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const inactivityTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setIsProcessingSpeech(false);
        setMicError(null);
      };

      recognition.onend = () => {
        setIsListening(false);
        if (inactivityTimeoutRef.current) {
            clearTimeout(inactivityTimeoutRef.current);
            inactivityTimeoutRef.current = null;
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        let errorMessage = 'An unknown microphone error occurred. Please try again.';
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          errorMessage = 'Microphone access was denied. Please allow microphone permissions in your browser settings and refresh the page.';
        } else if (event.error === 'no-speech') {
          errorMessage = 'No speech was detected. Please make sure your microphone is working.';
        } else if (event.error === 'network') {
            errorMessage = 'A network error occurred with speech recognition. Please check your connection.';
        } else if (event.error === 'audio-capture') {
            errorMessage = 'Could not capture audio. Please check your microphone hardware.';
        }
        setMicError(errorMessage);
        setIsListening(false);
        setIsProcessingSpeech(false);
      };

      recognition.onresult = (event: any) => {
        if (inactivityTimeoutRef.current) {
            clearTimeout(inactivityTimeoutRef.current);
        }

        let interimTranscript = '';
        let lastFinalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            lastFinalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        const trimmedFinal = lastFinalTranscript.trim();
        if (trimmedFinal) {
            finalTranscriptRef.current += trimmedFinal + ' ';
        }
        const currentText = (finalTranscriptRef.current + interimTranscript).trim();
        setPrompt(currentText);

        if (isConversationMode) {
          inactivityTimeoutRef.current = window.setTimeout(() => {
            const transcriptToSend = finalTranscriptRef.current.trim();
            if (transcriptToSend) {
                setIsProcessingSpeech(true);
                recognition.stop();
                finalTranscriptRef.current = ''; 
                setPrompt('');
                onSend(transcriptToSend);
            }
          }, CONVERSATION_MODE_SEND_DELAY);
        }
      };
      
      recognitionRef.current = recognition;
    } else {
        setIsMicSupported(false);
        setMicError("Speech recognition is not supported by your browser.");
    }

    return () => {
        if (inactivityTimeoutRef.current) {
            clearTimeout(inactivityTimeoutRef.current);
        }
        recognitionRef.current?.abort();
    };
  }, [isConversationMode, onSend]);

  useEffect(() => {
    if (isConversationMode) {
        finalTranscriptRef.current = '';
        recognitionRef.current?.start();
    } else {
      recognitionRef.current?.stop();
    }
  }, [isConversationMode]);

  useEffect(() => {
      if (isConversationMode && autoListenTrigger > 0) {
          finalTranscriptRef.current = '';
          recognitionRef.current?.start();
      }
  }, [autoListenTrigger, isConversationMode]);


  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = `${scrollHeight}px`;
    }
  }, [prompt]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (toolMenuRef.current && !toolMenuRef.current.contains(event.target as Node)) {
        setIsToolMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [toolMenuRef]);
  
  const handleMicClick = () => {
    if (!recognitionRef.current || isConversationMode || !isMicSupported) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      finalTranscriptRef.current = '';
      setPrompt('');
      recognitionRef.current.start();
    }
  };

  const handleSend = () => {
    if (prompt.trim() && !disabled) {
      const finalPrompt = selectedTool
        ? `[Using Tool: ${selectedTool}] ${prompt}`
        : prompt;
      onSend(finalPrompt);
      setPrompt('');
      setSelectedTool(null);
    }
  };

  const handleSelectTool = (toolName: string) => {
    setSelectedTool(toolName);
    setIsToolMenuOpen(false);
    textareaRef.current?.focus();
  };


  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`relative w-full bg-white dark:bg-gray-800 rounded-2xl border ${disabled || isConversationMode ? 'border-gray-200 dark:border-gray-700' : 'border-gray-300 dark:border-gray-600 focus-within:ring-2 focus-within:ring-indigo-500 dark:focus-within:ring-indigo-400 focus-within:border-transparent'} shadow-sm p-2 sm:p-4 transition-all duration-200`}>
      <div className="flex items-start space-x-2 sm:space-x-4">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            disabled ? "Waiting for response..."
            : isConversationMode ? "Listening... start speaking to the AI"
            : isListening ? "Listening..."
            : selectedTool ? `Ask me to use ${selectedTool}...`
            : "Welcome to Dr's lab"
          }
          className="flex-1 bg-transparent focus:outline-none resize-none text-base sm:text-lg placeholder-gray-500 dark:placeholder-gray-400 dark:text-white w-full"
          rows={1}
          disabled={disabled || isConversationMode}
        />
        <button
          onClick={handleSend}
          disabled={!prompt.trim() || disabled || isConversationMode}
          className="bg-gray-800 dark:bg-indigo-600 text-white rounded-full w-9 h-9 flex items-center justify-center disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          aria-label="Send message"
        >
          <SendIcon className="w-4 h-4" />
        </button>
      </div>
      <div className="mt-2 sm:mt-4 flex items-center space-x-2 flex-wrap">
        <button 
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500" 
          aria-label="Add attachment" 
          disabled={disabled || isConversationMode}
          title="Attach a file"
        >
          <PlusIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>

        <div className="relative" ref={toolMenuRef}>
           {isToolMenuOpen && (
            <div className="absolute bottom-full left-0 mb-2 w-80 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 z-10 p-2 max-h-[50vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white px-3 pt-2 pb-4">Select a Tool</h3>
              <div className="space-y-3 p-1">
                {tools.map((tool) => (
                  <button
                    key={tool.name}
                    onClick={() => handleSelectTool(tool.name)}
                    className="w-full flex items-center text-left p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg mr-4 flex-shrink-0">
                        <tool.icon className="w-10 h-10 text-gray-600 dark:text-gray-300"/>
                    </div>
                    <div>
                        <p className="font-medium text-sm text-gray-800 dark:text-gray-200">{tool.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{tool.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button 
            onClick={() => setIsToolMenuOpen(prev => !prev)}
            className="flex items-center space-x-1.5 py-2 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500" 
            aria-label="Use tools" 
            disabled={disabled || isConversationMode}
            title="Select a tool to use"
          >
            <ToolsIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="hidden sm:inline text-sm font-medium text-gray-600 dark:text-gray-400">Tools</span>
          </button>
        </div>
        
        <button
            onClick={handleMicClick}
            disabled={disabled || isConversationMode || !isMicSupported}
            className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 relative disabled:opacity-50 disabled:cursor-not-allowed ${isListening && !isProcessingSpeech ? 'animate-pulse' : ''}`}
            aria-label={isListening ? 'Stop listening' : 'Use microphone'}
            title={micError || (isListening ? 'Stop listening' : 'Use microphone')}
        >
            <MicrophoneIcon className={`w-5 h-5 ${!isMicSupported ? 'text-gray-400 dark:text-gray-600' : (isListening || (isConversationMode && !isProcessingSpeech)) ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'}`} />
        </button>

        {selectedTool && (
          <div className="flex items-center bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 text-sm font-medium px-3 py-1.5 rounded-lg my-1">
            <span>{selectedTool}</span>
            <button
              onClick={() => setSelectedTool(null)}
              className="ml-2 -mr-1 p-0.5 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-700/50 text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-200"
              aria-label={`Clear ${selectedTool} tool`}
              title={`Clear ${selectedTool} tool`}
            >
              <CloseIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
      {micError && (
          <p className="text-xs text-red-500 mt-2 px-2 text-center sm:text-left">{micError}</p>
      )}
    </div>
  );
};

export default ChatInput;