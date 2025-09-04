import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopBanner from './components/TopBanner';
import MainContent from './components/MainContent';
import { GoogleGenAI } from "@google/genai";

export interface Message {
  text: string;
  isUser: boolean;
}

const App: React.FC = () => {
  const [isBannerVisible, setIsBannerVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState<string>('gemini-2.5-flash');
  const [theme, setTheme] = useState(() => {
    try {
      const savedTheme = localStorage.getItem('theme');
      return savedTheme ? savedTheme : 'light';
    } catch (error) {
      console.error("Failed to load theme from localStorage", error);
      return 'light';
    }
  });

  const [responseMode, setResponseMode] = useState<'text' | 'voice'>(() => {
    try {
      const savedMode = localStorage.getItem('responseMode');
      return savedMode === 'voice' ? 'voice' : 'text';
    } catch (error) {
      console.error("Failed to load response mode from localStorage", error);
      return 'text';
    }
  });

  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const savedMessages = localStorage.getItem('chatHistory');
      return savedMessages ? JSON.parse(savedMessages) : [];
    } catch (error) {
      console.error("Failed to load messages from localStorage", error);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('chatHistory', JSON.stringify(messages));
    } catch (error) {
      console.error("Failed to save messages to localStorage", error);
    }
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem('theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (error) {
      console.error("Failed to save theme to localStorage", error);
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem('responseMode', responseMode);
    } catch (error) {
      console.error("Failed to save response mode to localStorage", error);
    }
  }, [responseMode]);


  const handleCloseBanner = () => {
    setIsBannerVisible(false);
  };

  const handleNewChat = () => {
    setMessages([]);
    localStorage.removeItem('chatHistory');
    window.speechSynthesis?.cancel();
  };

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };
  
  const toggleResponseMode = () => {
    setResponseMode(prevMode => {
        const newMode = prevMode === 'text' ? 'voice' : 'text';
        if (newMode === 'text') {
          window.speechSynthesis?.cancel();
        }
        return newMode;
    });
  };

  const handleSend = async (prompt: string) => {
    if (!prompt.trim()) return;

    window.speechSynthesis?.cancel();
    const userMessage: Message = { text: prompt, isUser: true };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
      });
      
      const aiMessage: Message = { text: response.text, isUser: false };
      setMessages(prev => [...prev, aiMessage]);

      if (responseMode === 'voice') {
        const utterance = new SpeechSynthesisUtterance(response.text);
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error("Error generating content:", error);
      const errorMessage: Message = { text: "I'm sorry, but I ran into a problem generating a response. Please try your request again. If the problem continues, please let our support team know.", isUser: false };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans antialiased">
      <Sidebar 
        onNewChat={handleNewChat}
        model={model}
        onModelChange={setModel}
        theme={theme}
        toggleTheme={toggleTheme}
        responseMode={responseMode}
        toggleResponseMode={toggleResponseMode}
      />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {isBannerVisible && <TopBanner onClose={handleCloseBanner} />}
        <MainContent messages={messages} isLoading={isLoading} onSend={handleSend} />
      </main>
    </div>
  );
};

export default App;