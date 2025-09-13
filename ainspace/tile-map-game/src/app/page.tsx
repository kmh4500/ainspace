'use client';

import TileMap from '@/components/TileMap';
import ChatBox, { ChatBoxRef } from '@/components/ChatBox';
import { useGameState } from '@/hooks/useGameState';
import { useState, useRef } from 'react';

export default function Home() {
  const { playerPosition, mapData, worldPosition, movePlayer, isLoading, userId, visibleAgents, agents, worldAgents, isAutonomous, toggleAutonomous, lastCommentary } = useGameState();
  const [activeTab, setActiveTab] = useState<'map' | 'thread'>('map');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [threads, setThreads] = useState<{
    id: string;
    message: string;
    timestamp: Date;
    agentsReached: number;
    agentNames: string[];
  }[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [broadcastStatus, setBroadcastStatus] = useState<{
    range: number;
    agentsReached: number;
    agentNames: string[];
  } | null>(null);
  const chatBoxRef = useRef<ChatBoxRef>(null);

  const handleMobileMove = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (!isAutonomous) {
      movePlayer(direction);
    }
  };

  const handleBroadcast = async () => {
    if (broadcastMessage.trim()) {
      const messageText = broadcastMessage.trim();
      
      // Calculate agents within range (default broadcast range: 10 units)
      const broadcastRange = 10;
      const agentsInRange = worldAgents.filter(agent => {
        const distance = Math.sqrt(
          Math.pow(agent.x - worldPosition.x, 2) + 
          Math.pow(agent.y - worldPosition.y, 2)
        );
        return distance <= broadcastRange;
      });
      
      console.log('Broadcast setup:', {
        totalAgents: worldAgents.length,
        agentsInRange: agentsInRange.length,
        agentNames: agentsInRange.map(a => a.name),
        agentIds: agentsInRange.map(a => a.id)
      });
      
      // Set broadcast status
      setBroadcastStatus({
        range: broadcastRange,
        agentsReached: agentsInRange.length,
        agentNames: agentsInRange.map(agent => agent.name)
      });
      
      setBroadcastMessage('');
      
      // Only create thread and send message if there are agents in range
      if (agentsInRange.length > 0 && chatBoxRef.current) {
        // Create new thread with unique ID
        const threadId = `thread-${Date.now()}`;
        const newThread = {
          id: threadId,
          message: messageText,
          timestamp: new Date(),
          agentsReached: agentsInRange.length,
          agentNames: agentsInRange.map(agent => agent.name)
        };
        
        // Add to threads list and set as current thread
        setThreads(prev => [newThread, ...prev]);
        setCurrentThreadId(threadId);
        
        try {
          // Send the broadcast message through the ChatBox system with thread ID and radius
          await chatBoxRef.current.sendMessage(messageText, threadId, broadcastRange);
          console.log(`Broadcasting "${messageText}" to ${agentsInRange.length} agents in thread ${threadId}:`, agentsInRange.map(a => a.name));
        } catch (error) {
          console.error('Failed to broadcast message:', error);
        }
      } else {
        console.log(`No agents in range - broadcast message "${messageText}" not sent, no thread created`);
      }
      
      // Clear broadcast status after 5 seconds
      setTimeout(() => {
        setBroadcastStatus(null);
      }, 5000);
    }
  };

  const handleViewThread = (threadId?: string) => {
    // Set current thread if specified, otherwise use most recent
    if (threadId) {
      setCurrentThreadId(threadId);
    } else if (threads.length > 0) {
      setCurrentThreadId(threads[0].id);
    }
    // Switch to thread tab to view the conversation
    setActiveTab('thread');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="max-w-md mx-auto flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white p-4 shadow-sm">
          <h1 className="text-xl font-bold text-center text-gray-800">
            AIN Space
          </h1>
        </div>
        
        {/* Tab Navigation */}
        <div className="bg-white border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('map')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'map'
                  ? 'bg-blue-600 text-white border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              🗺️ Map
            </button>
            <button
              onClick={() => setActiveTab('thread')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'thread'
                  ? 'bg-blue-600 text-white border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              💬 Thread
            </button>
          </div>
        </div>
        
        {/* Tab Content */}
        <div className="flex-1 bg-white relative">
          {/* Map Tab Content */}
          <div className={`h-full p-4 flex flex-col ${activeTab !== 'map' ? 'hidden' : ''}`}>
            {/* Game Area */}
            <div className="flex-1 flex flex-col">
              <div className="flex justify-center mb-4">
                <TileMap 
                  mapData={mapData}
                  tileSize={40}
                  playerPosition={playerPosition}
                  agents={visibleAgents}
                />
              </div>
              
              {/* Mobile Arrow Controls */}
              <div className="flex flex-col items-center mb-4">
                {/* Top Row - Up Button */}
                <div className="flex justify-center mb-2">
                  <button
                    onClick={() => handleMobileMove('up')}
                    disabled={isAutonomous}
                    className={`w-12 h-12 rounded text-xl font-bold transition-colors ${
                      isAutonomous 
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white shadow-md'
                    }`}
                  >
                    ↑
                  </button>
                </div>
                
                {/* Bottom Row - Left, Down, Right Buttons */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleMobileMove('left')}
                    disabled={isAutonomous}
                    className={`w-12 h-12 rounded text-xl font-bold transition-colors ${
                      isAutonomous 
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white shadow-md'
                    }`}
                  >
                    ←
                  </button>
                  <button
                    onClick={() => handleMobileMove('down')}
                    disabled={isAutonomous}
                    className={`w-12 h-12 rounded text-xl font-bold transition-colors ${
                      isAutonomous 
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white shadow-md'
                    }`}
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => handleMobileMove('right')}
                    disabled={isAutonomous}
                    className={`w-12 h-12 rounded text-xl font-bold transition-colors ${
                      isAutonomous 
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white shadow-md'
                    }`}
                  >
                    →
                  </button>
                </div>
              </div>
              
              {/* Broadcast Message Box */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                <div className="flex items-center mb-2">
                  <span className="text-sm font-medium text-gray-700 mr-2">📢 Broadcast:</span>
                  {broadcastStatus && (
                    <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full animate-pulse">
                      Sent {broadcastStatus.range}u range
                    </span>
                  )}
                  {threads.length > 0 && !broadcastStatus && (
                    <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">
                      Thread created
                    </span>
                  )}
                </div>
                
                {/* Broadcast Status */}
                {broadcastStatus && (
                  <div className="bg-orange-50 border border-orange-200 rounded p-2 mb-2">
                    <div className="text-xs text-orange-800 mb-1">
                      📶 Message broadcast {broadcastStatus.range} units from ({worldPosition.x}, {worldPosition.y})
                    </div>
                    <div className="text-xs text-orange-700">
                      🤖 Reached {broadcastStatus.agentsReached} agent{broadcastStatus.agentsReached !== 1 ? 's' : ''}:
                      {broadcastStatus.agentNames.length > 0 ? (
                        <span className="ml-1 font-medium">
                          {broadcastStatus.agentNames.join(', ')}
                        </span>
                      ) : (
                        <span className="ml-1 text-gray-500">No agents in range</span>
                      )}
                    </div>
                  </div>
                )}
                
                {threads.length > 0 && !broadcastStatus ? (
                  <div className="bg-white border border-gray-200 rounded p-2 mb-2">
                    <p className="text-sm text-gray-800">{threads[0].message}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">
                        Recent thread • {threads[0].agentsReached} agent{threads[0].agentsReached !== 1 ? 's' : ''}
                      </span>
                      <button
                        onClick={() => handleViewThread(threads[0].id)}
                        className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
                      >
                        View Thread
                      </button>
                    </div>
                  </div>
                ) : !broadcastStatus && (
                  <div className="text-xs text-gray-500 mb-2">
                    Start a conversation with agents nearby (10u range)
                  </div>
                )}
                
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleBroadcast()}
                    placeholder="Type broadcast message..."
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleBroadcast}
                    disabled={!broadcastMessage.trim()}
                    className="px-3 py-1 text-sm bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Send
                  </button>
                </div>
              </div>
              
              {/* Compact Info */}
              <div className="space-y-2">
                <div className="text-center">
                  <p className="text-gray-600 text-sm">
                    World: ({worldPosition.x}, {worldPosition.y})
                  </p>
                  {userId && (
                    <p className="text-gray-400 text-xs">
                      {userId.slice(0, 8)}... {isLoading ? '(Loading...)' : '(Saved)'}
                    </p>
                  )}
                </div>
                
                {/* Autonomous Control Button */}
                <div className="flex justify-center">
                  <button
                    onClick={toggleAutonomous}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isAutonomous
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                  >
                    {isAutonomous ? '🔴 Stop' : '▶️ Auto'}
                  </button>
                </div>
                
                <div className="text-center text-xs text-gray-500">
                  {isAutonomous ? 'Moving autonomously...' : 'Use arrow keys to move'}
                </div>
              </div>
            </div>
          </div>
          
          {/* Thread Tab Content - Always rendered but conditionally visible */}
          <div className={`h-full ${activeTab !== 'thread' ? 'hidden' : ''}`}>
            <ChatBox 
              ref={chatBoxRef}
              className="h-full" 
              aiCommentary={lastCommentary}
              agents={worldAgents}
              playerWorldPosition={worldPosition}
              currentThreadId={currentThreadId || undefined}
              threads={threads}
              onThreadSelect={setCurrentThreadId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
