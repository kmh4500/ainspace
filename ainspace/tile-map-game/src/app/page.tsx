'use client';

import TileMap from '@/components/TileMap';
import ChatBox from '@/components/ChatBox';
import { useGameState } from '@/hooks/useGameState';

export default function Home() {
  const { playerPosition, mapData, worldPosition, isLoading, userId, visibleAgents, agents } = useGameState();

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          Tile Map Game
        </h1>
        
        <div className="flex gap-6">
          {/* Game Area */}
          <div className="flex-1">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <div className="flex justify-center mb-4">
                <TileMap 
                  mapData={mapData}
                  tileSize={40}
                  playerPosition={playerPosition}
                  agents={visibleAgents}
                />
              </div>
              
              <div className="text-center space-y-2">
                <p className="text-gray-600">
                  World Position: ({worldPosition.x}, {worldPosition.y})
                </p>
                <p className="text-gray-500 text-sm">
                  Screen Position: ({playerPosition.x}, {playerPosition.y})
                </p>
                {userId && (
                  <p className="text-gray-400 text-xs">
                    User ID: {userId.slice(0, 8)}... {isLoading ? '(Loading...)' : '(Saved)'}
                  </p>
                )}
                
                {/* Agent Positions */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Agent Positions</h4>
                  <div className="space-y-1 text-xs">
                    {agents.map((agent) => (
                      <div key={agent.id} className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 mr-2 rounded-sm border border-gray-400"
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
                  <div className="mt-2 text-xs text-gray-500 flex items-center">
                    <span className="text-green-600 mr-1">●</span>
                    <span>Visible on map</span>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  <p>Use arrow keys to move</p>
                  <div className="flex justify-center mt-4 space-x-4">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-green-400 mr-2"></div>
                      <span>Grass</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-yellow-700 mr-2"></div>
                      <span>Dirt</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-blue-500 mr-2"></div>
                      <span>Water</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-gray-500 mr-2"></div>
                      <span>Stone (Wall)</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-red-500 mr-2"></div>
                      <span>Player</span>
                    </div>
                  </div>
                  <div className="flex justify-center mt-2 space-x-4 text-xs">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 mr-1"></div>
                      <span>Agent</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-orange-500 mr-1"></div>
                      <span>Agent</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-purple-500 mr-1"></div>
                      <span>Agent</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="w-80">
            <ChatBox className="h-[600px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
