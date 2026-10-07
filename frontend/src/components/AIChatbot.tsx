import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Loader2, Mic, MicOff, Languages } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useNavigate } from 'react-router-dom';

interface Message {
  id: string;
  type: 'bot' | 'user';
  text: string;
}

const INITIAL_MESSAGE: Message = {
  id: '1',
  type: 'bot',
  text: "Hello! I'm CoalBot. I monitor mine safety, track compliance, and navigate the dashboard for you. How can I assist you today?"
};

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [language, setLanguage] = useState<'en-US' | 'hi-IN'>('en-US');
  const recognitionRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        
        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputValue(prev => prev ? prev + ' ' + transcript : transcript);
          setIsListening(false);
          // Automatically send the voice command
          handleSend(transcript);
        };
        
        recognitionRef.current.onerror = () => setIsListening(false);
        recognitionRef.current.onend = () => setIsListening(false);
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Voice input is not supported in this browser. Try Chrome.");
      return;
    }
    
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.lang = language;
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en-US' ? 'hi-IN' : 'en-US');
  };

  const handleSend = async (overrideText?: string) => {
    const textToSend = typeof overrideText === 'string' ? overrideText : inputValue;
    if (!textToSend.trim()) return;

    const newUserMsg: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: textToSend
    };

    setMessages(prev => [...prev, newUserMsg]);
    setInputValue('');
    setIsTyping(true);

    const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-3.8-flash",
        systemInstruction: `You are CoalBot, the official AI assistant for CoalGuard. 
        You monitor mine safety, track DGMS compliance, and predict risks. 
        Be professional, concise, and helpful. Use formatting (bolding, lists).
        
        CRITICAL: If the user asks to see or go to a specific dashboard/page, you MUST include a navigation tag at the very end of your response. 
        Format: [NAVIGATE:/path]
        
        Available paths:
        - /violations (for violations, safety alerts)
        - /compliance (for DGMS compliance status)
        - /mines-map (for map, locations)
        - /inspections (for audit logs, inspection reports)
        - /contractors (for contractor info)
        - /profile (for user settings)
        
        Example response: "I can show you the recent safety alerts. [NAVIGATE:/violations]"`,
      });

      const chat = model.startChat({
        history: messages.slice(1).map(msg => ({ 
          role: msg.type === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }],
        })),
      });

      const result = await chat.sendMessage(textToSend);
      let botResponse = result.response.text();

      // Check for navigation command
      const navMatch = botResponse.match(/\[NAVIGATE:([^\]]+)\]/);
      if (navMatch) {
        const path = navMatch[1];
        // Remove the tag from the text shown to the user
        botResponse = botResponse.replace(/\[NAVIGATE:[^\]]+\]/, '').trim();
        // If the message is completely empty after removing the tag, add a brief response
        if (!botResponse) botResponse = "Navigating right away!";
        
        // Wait slightly for the user to read before navigating
        setTimeout(() => {
          navigate(path);
        }, 2000);
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        text: botResponse
      }]);
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      const isApiKeyIssue = error.message?.includes('API key') || import.meta.env.VITE_GEMINI_API_KEY?.length < 10;
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        text: isApiKeyIssue 
          ? "I'm having trouble connecting to my central neural network. It looks like the API key is invalid or missing. Ensure your key is correct and restart your Vite server."
          : "I'm sorry, I encountered an error connecting to my systems. Please try again."
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-[9990]">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center transform hover:scale-110 active:scale-95"
        >
          {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 w-96 h-[550px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col z-[9990] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-emerald-600 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">CoalGuard AI</h3>
                  <p className="text-xs text-emerald-100 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
                    Online & Monitoring
                  </p>
                </div>
              </div>
              
              {/* Language Toggle */}
              <button 
                onClick={toggleLanguage}
                className="flex items-center gap-1 bg-emerald-700/50 hover:bg-emerald-700 px-2 py-1 rounded-md text-xs transition-colors"
                title="Toggle Voice Language"
              >
                <Languages className="w-3 h-3" />
                {language === 'en-US' ? 'ENG' : 'HIN'}
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.type === 'bot' && (
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                      msg.type === 'user'
                        ? 'bg-emerald-600 text-white rounded-br-none'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-bl-none shadow-sm whitespace-pre-wrap'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {msg.type === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 mt-1">
                      <User className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </div>
                  )}
                </div>
              ))}
              
              {isTyping && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-1 shadow-sm">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl pr-2 pl-4 py-1">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={isListening ? "Listening..." : "Ask about compliance, risks..."}
                    className="flex-1 bg-transparent border-none focus:outline-none text-sm text-slate-700 dark:text-slate-200 py-2 min-w-0"
                  />
                  
                  {/* Voice Button */}
                  <button
                    onClick={toggleListening}
                    className={`p-2 rounded-full transition-colors flex items-center justify-center ${
                      isListening 
                        ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 animate-pulse' 
                        : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                    title="Voice Input"
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  {/* Send Button */}
                  <button
                    onClick={() => handleSend()}
                    disabled={!inputValue.trim() || isTyping}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 text-white p-2 rounded-full transition-colors flex items-center justify-center"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
