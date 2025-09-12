'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useWorld } from '@/hooks/useWorld';
import { Agent, AgentResponse } from '@/lib/world';

interface Message {
  id: string;
  text: string;
  timestamp: Date;
  sender: 'user' | 'system' | 'ai';
}

interface ChatBoxProps {
  className?: string;
  onAddMessage?: (message: Message) => void;
  aiCommentary?: string;
  agents?: Agent[];
  playerWorldPosition?: { x: number; y: number };
}

export default function ChatBox({ className = '', aiCommentary, agents = [], playerWorldPosition }: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Welcome to the Tile Map Game! Use arrow keys to move around.',
      timestamp: new Date(),
      sender: 'system'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize world system
  const { sendMessage, getAgentSuggestions } = useWorld({
    agents: agents || [],
    playerPosition: playerWorldPosition || { x: 0, y: 0 },
    onAgentResponse: (response: AgentResponse) => {
      // Add agent response to chat
      const agentMessage: Message = {
        id: `agent-${response.agentId}-${Date.now()}`,
        text: response.message,
        timestamp: new Date(),
        sender: 'ai'
      };
      
      setMessages(prev => [...prev, agentMessage]);
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add AI commentary to messages when it changes
  useEffect(() => {
    if (aiCommentary && aiCommentary.trim()) {
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        text: aiCommentary,
        timestamp: new Date(),
        sender: 'ai'
      };

      setMessages(prev => {
        // Check if the last message is the same AI commentary to avoid duplicates
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.sender === 'ai' && lastMessage.text === aiCommentary) {
          return prev;
        }
        return [...prev, aiMessage];
      });
    }
  }, [aiCommentary]);

  const handleSendMessage = async () => {
    if (inputValue.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        text: inputValue.trim(),
        timestamp: new Date(),
        sender: 'user'
      };

      setMessages(prev => [...prev, newMessage]);
      const userMessageText = inputValue.trim();
      setInputValue('');

      // Send message through world system
      await sendMessage(userMessageText);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (showSuggestions && filteredAgents.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < filteredAgents.length - 1 ? prev + 1 : 0
        );
        return;
      }
      
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : filteredAgents.length - 1
        );
        return;
      }
      
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        if (filteredAgents[selectedSuggestionIndex]) {
          selectSuggestion(filteredAgents[selectedSuggestionIndex]);
        }
        return;
      }
      
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuggestions(false);
        setFilteredAgents([]);
        setSelectedSuggestionIndex(0);
        return;
      }
    }
    
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle input changes and check for @ mentions
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    
    setInputValue(value);
    setCursorPosition(cursorPos);
    
    // Check if we're typing an @ mention
    const beforeCursor = value.substring(0, cursorPos);
    const atMatch = beforeCursor.match(/@(\w*)$/);
    
    if (atMatch) {
      const searchTerm = atMatch[1];
      const filtered = getAgentSuggestions(searchTerm);
      setFilteredAgents(filtered);
      setShowSuggestions(filtered.length > 0);
      setSelectedSuggestionIndex(0);
    } else {
      setShowSuggestions(false);
      setFilteredAgents([]);
      setSelectedSuggestionIndex(0);
    }
  }, [getAgentSuggestions]);

  // Handle suggestion selection
  const selectSuggestion = useCallback((agent: Agent) => {
    const beforeCursor = inputValue.substring(0, cursorPosition);
    const afterCursor = inputValue.substring(cursorPosition);
    const atMatch = beforeCursor.match(/@(\w*)$/);
    
    if (atMatch) {
      const beforeAt = beforeCursor.substring(0, beforeCursor.length - atMatch[0].length);
      const newValue = beforeAt + `@${agent.name} ` + afterCursor;
      setInputValue(newValue);
      setShowSuggestions(false);
      setFilteredAgents([]);
      setSelectedSuggestionIndex(0);
      
      // Focus back to input
      setTimeout(() => {
        if (inputRef.current) {
          const newCursorPos = beforeAt.length + agent.name.length + 2;
          inputRef.current.focus();
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }
  }, [inputValue, cursorPosition]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex flex-col bg-white rounded-lg shadow-lg ${className}`}>
      {/* Chat Header */}
      <div className="bg-blue-600 text-white p-3 rounded-t-lg">
        <h3 className="font-semibold text-sm">Game Chat</h3>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex flex-col ${
              message.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                message.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : message.sender === 'ai'
                  ? 'bg-green-100 text-green-800 rounded-bl-sm border border-green-300'
                  : 'bg-gray-200 text-gray-800 rounded-bl-sm'
              }`}
            >
              {message.sender === 'ai' && (
                <div className="flex items-center mb-1">
                  <span className="text-xs font-semibold text-green-600">
                    🤖 {message.id.includes('agent-') ? 
                      (() => {
                        const agent = agents.find(a => message.id.includes(a.id));
                        if (agent && playerWorldPosition) {
                          const distance = Math.sqrt(
                            Math.pow(agent.x - playerWorldPosition.x, 2) + 
                            Math.pow(agent.y - playerWorldPosition.y, 2)
                          );
                          return `${agent.name} (${agent.x}, ${agent.y}) [${distance.toFixed(1)}u]`;
                        }
                        return agent ? `${agent.name} (${agent.x}, ${agent.y})` : 'AI Agent';
                      })() : 
                      'AI Explorer'
                    }
                  </span>
                </div>
              )}
              <p className="break-words">{message.text}</p>
            </div>
            <span className="text-xs text-gray-500 mt-1">
              {formatTime(message.timestamp)}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t p-3 relative">
        {/* Agent Suggestions Dropdown */}
        {showSuggestions && filteredAgents.length > 0 && (
          <div className="absolute bottom-full left-3 right-3 mb-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-32 overflow-y-auto z-10">
            {filteredAgents.map((agent, index) => {
              const distance = playerWorldPosition ? 
                Math.sqrt(Math.pow(agent.x - playerWorldPosition.x, 2) + Math.pow(agent.y - playerWorldPosition.y, 2)) : 0;
              
              const isSelected = index === selectedSuggestionIndex;
              
              return (
                <button
                  key={agent.id}
                  onClick={() => selectSuggestion(agent)}
                  className={`w-full px-3 py-2 text-left text-sm focus:outline-none flex items-center justify-between ${
                    isSelected 
                      ? 'bg-blue-100 text-blue-900' 
                      : 'hover:bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-sm mr-2 border border-gray-400"
                      style={{ backgroundColor: agent.color }}
                    ></div>
                    <span className="font-medium">{agent.name}</span>
                  </div>
                  <div className={`text-xs ${isSelected ? 'text-blue-700' : 'text-gray-500'}`}>
                    ({agent.x}, {agent.y}) [{distance.toFixed(1)}u]
                  </div>
                </button>
              );
            })}
          </div>
        )}
        
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Type your message... (use @ to mention agents)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}