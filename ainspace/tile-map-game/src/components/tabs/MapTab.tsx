import React from 'react';
import TileMap from '@/components/TileMap';
import BaseTabContent from './BaseTabContent';

interface MapTabProps {
  isActive: boolean;
  playerPosition: { x: number; y: number };
  mapData: number[][];
  worldPosition: { x: number; y: number };
  visibleAgents: Array<{
    id: string;
    screenX: number;
    screenY: number;
    color: string;
    name: string;
  }>;
  publishedTiles: { [key: string]: string };
  customTiles: { [key: string]: string };
  isAutonomous: boolean;
  onMobileMove: (direction: 'up' | 'down' | 'left' | 'right') => void;
  broadcastMessage: string;
  setBroadcastMessage: (message: string) => void;
  onBroadcast: () => void;
  broadcastStatus: {
    range: number;
    agentsReached: number;
    agentNames: string[];
  } | null;
  threads: {
    id: string;
    message: string;
    timestamp: Date;
    agentsReached: number;
    agentNames: string[];
  }[];
  onViewThread: (threadId?: string) => void;
  userId: string | null;
  isLoading: boolean;
  toggleAutonomous: () => void;
}

export default function MapTab({
  isActive,
  playerPosition,
  mapData,
  worldPosition,
  visibleAgents,
  publishedTiles,
  customTiles,
  isAutonomous,
  onMobileMove,
  broadcastMessage,
  setBroadcastMessage,
  onBroadcast,
  broadcastStatus,
  threads,
  onViewThread,
  userId,
  isLoading,
  toggleAutonomous
}: MapTabProps) {
  return (
    <BaseTabContent isActive={isActive}>
      {/* Game Area */}
      <div className="flex-1 flex flex-col">
        <div className="flex justify-center mb-4">
          <TileMap 
            mapData={mapData}
            tileSize={40}
            playerPosition={playerPosition}
            worldPosition={worldPosition}
            agents={visibleAgents}
            customTiles={{ ...publishedTiles, ...customTiles }}
          />
        </div>
        
        {/* Mobile Arrow Controls */}
        <div className="flex flex-col items-center mb-4">
          {/* Top Row - Up Button */}
          <div className="flex justify-center mb-2">
            <button
              onClick={() => onMobileMove('up')}
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
              onClick={() => onMobileMove('left')}
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
              onClick={() => onMobileMove('down')}
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
              onClick={() => onMobileMove('right')}
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
                  onClick={() => onViewThread(threads[0].id)}
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
              onKeyPress={(e) => e.key === 'Enter' && onBroadcast()}
              placeholder="Type broadcast message..."
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={onBroadcast}
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
    </BaseTabContent>
  );
}