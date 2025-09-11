'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMapData } from '@/providers/MapDataProvider';
import { useSession } from '@/hooks/useSession';
import { useAgents } from '@/hooks/useAgents';

interface Position {
  x: number;
  y: number;
}

const MAP_WIDTH = 16;
const MAP_HEIGHT = 12;

export function useGameState() {
  const { getMapData, generateTileAt } = useMapData();
  const { userId } = useSession();
  
  // Character starts at world position (0, 0), which will be center of the map
  const [worldPosition, setWorldPosition] = useState<Position>({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);
  
  // Get the current map data centered on the player's world position
  const mapData = getMapData(worldPosition.x, worldPosition.y, MAP_WIDTH, MAP_HEIGHT);
  
  // Player is always in the center of the visible map
  const playerPosition = { 
    x: Math.floor(MAP_WIDTH / 2), 
    y: Math.floor(MAP_HEIGHT / 2) 
  };

  // Initialize agents system
  const { agents, visibleAgents } = useAgents({
    playerWorldPosition: worldPosition,
    mapWidth: MAP_WIDTH,
    mapHeight: MAP_HEIGHT
  });

  const savePositionToRedis = useCallback(async (position: Position) => {
    if (!userId) return;
    
    try {
      await fetch('/api/position', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          position
        }),
      });
    } catch (error) {
      console.error('Failed to save position:', error);
    }
  }, [userId]);

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

      // Save new position to Redis
      savePositionToRedis(newWorldPosition);

      return newWorldPosition;
    });
  }, [generateTileAt, savePositionToRedis]);

  // Load saved position from Redis when user session is available
  useEffect(() => {
    const loadSavedPosition = async () => {
      if (!userId) return;
      
      setIsLoading(true);
      try {
        const response = await fetch(`/api/position?userId=${userId}`);
        const data = await response.json();
        
        if (response.ok && !data.isDefault) {
          setWorldPosition(data.position);
        }
      } catch (error) {
        console.error('Failed to load saved position:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedPosition();
  }, [userId]);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (isLoading) return; // Don't allow movement while loading
      
      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          movePlayer('up');
          break;
        case 'ArrowDown':
          event.preventDefault();
          movePlayer('down');
          break;
        case 'ArrowLeft':
          event.preventDefault();
          movePlayer('left');
          break;
        case 'ArrowRight':
          event.preventDefault();
          movePlayer('right');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [movePlayer, isLoading]);

  return {
    playerPosition,
    mapData,
    worldPosition,
    movePlayer,
    isLoading,
    userId,
    agents,
    visibleAgents
  };
}