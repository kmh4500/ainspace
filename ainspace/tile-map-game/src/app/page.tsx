'use client';

import TileMap from '@/components/TileMap';
import ChatBox from '@/components/ChatBox';
import { useGameState } from '@/hooks/useGameState';

export default function Home() {
  const { playerPosition, mapData, worldPosition, isLoading, userId, visibleAgents, agents, worldAgents, isAutonomous, toggleAutonomous, lastCommentary } = useGameState();

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="bg-white p-4 shadow-sm">
          <h1 className="text-xl font-bold text-center text-gray-800">
            Tile Map Game
          </h1>
        </div>
        
        <div className="flex flex-col">
          {/* Game Area */}
          <div className="bg-white p-4 shadow-sm">
            <div className="flex justify-center mb-3">
              <TileMap 
                mapData={mapData}
                tileSize={32}
                playerPosition={playerPosition}
                agents={visibleAgents}
              />
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

          {/* Agent Status - Collapsible */}
          <div className="bg-white border-t">
            <details className="group">
              <summary className="p-3 cursor-pointer text-sm font-semibold text-gray-700 bg-gray-50">
                Agent Status ({agents.length})
              </summary>
              <div className="p-3 space-y-2">
                {agents.map((agent) => (
                  <div key={agent.id} className="flex justify-between items-center text-xs">
                    <div className="flex items-center">
                      <div 
                        className="w-2 h-2 mr-2 rounded-sm"
                        style={{ backgroundColor: agent.color }}
                      ></div>
                      <span className="text-gray-700">{agent.name}</span>
                    </div>
                    <div className="text-gray-500">
                      ({agent.x}, {agent.y})
                      {visibleAgents.some(va => va.id === agent.id) && 
                        <span className="ml-1 text-green-600">●</span>
                      }
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </div>

          {/* Chat Area - Takes remaining space */}
          <div className="flex-1 min-h-0">
            <ChatBox 
              className="h-[400px]" 
              aiCommentary={lastCommentary}
              agents={worldAgents}
              playerWorldPosition={worldPosition}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
