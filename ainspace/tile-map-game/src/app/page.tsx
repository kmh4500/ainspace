'use client';

import TileMap from '@/components/TileMap';
import { useGameState } from '@/hooks/useGameState';

export default function Home() {
  const { playerPosition, mapData, worldPosition } = useGameState();

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          Tile Map Game
        </h1>
        
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <div className="flex justify-center mb-4">
            <TileMap 
              mapData={mapData}
              tileSize={40}
              playerPosition={playerPosition}
            />
          </div>
          
          <div className="text-center space-y-2">
            <p className="text-gray-600">
              World Position: ({worldPosition.x}, {worldPosition.y})
            </p>
            <p className="text-gray-500 text-sm">
              Screen Position: ({playerPosition.x}, {playerPosition.y})
            </p>
            <div className="text-sm text-gray-500">
              <p>Use arrow keys or WASD to move</p>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
