'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMapData } from '@/providers/MapDataProvider';

interface Position {
  x: number;
  y: number;
}

const MAP_WIDTH = 16;
const MAP_HEIGHT = 12;

export function useGameState() {
  const { getMapData, generateTileAt } = useMapData();
  
  // Character starts at world position (0, 0), which will be center of the map
  const [worldPosition, setWorldPosition] = useState<Position>({ x: 0, y: 0 });
  
  // Get the current map data centered on the player's world position
  const mapData = getMapData(worldPosition.x, worldPosition.y, MAP_WIDTH, MAP_HEIGHT);
  
  // Player is always in the center of the visible map
  const playerPosition = { 
    x: Math.floor(MAP_WIDTH / 2), 
    y: Math.floor(MAP_HEIGHT / 2) 
  };

  const movePlayer = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    setWorldPosition(prevWorldPos => {
      const newWorldPosition = { ...prevWorldPos };
      
      switch (direction) {
        case 'up':
          newWorldPosition.y -= 1;
          break;
        case 'down':
          newWorldPosition.y += 1;
          break;
        case 'left':
          newWorldPosition.x -= 1;
          break;
        case 'right':
          newWorldPosition.x += 1;
          break;
      }

      // Check if the new world position is walkable
      const tileType = generateTileAt(newWorldPosition.x, newWorldPosition.y);
      if (tileType === 3) { // Stone/wall - can't move there
        return prevWorldPos;
      }

      return newWorldPosition;
    });
  }, [generateTileAt]);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          event.preventDefault();
          movePlayer('up');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          event.preventDefault();
          movePlayer('down');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          event.preventDefault();
          movePlayer('left');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          event.preventDefault();
          movePlayer('right');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [movePlayer]);

  return {
    playerPosition,
    mapData,
    worldPosition,
    movePlayer
  };
}