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
const VIEW_RADIUS = 6; // Circular view radius

export function useGameState() {
  const { getMapData, generateTileAt } = useMapData();
  const { userId } = useSession();
  
  // Character starts at world position (0, 0), which will be center of the map
  const [worldPosition, setWorldPosition] = useState<Position>({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isAutonomous, setIsAutonomous] = useState(false);
  const [playerDirection, setPlayerDirection] = useState<'up' | 'down' | 'left' | 'right'>('right');
  const [recentMovements, setRecentMovements] = useState<string[]>([]);
  const [lastCommentary, setLastCommentary] = useState<string>('');
  
  // Get the current map data centered on the player's world position with full square view
  const mapData = getMapData(worldPosition.x, worldPosition.y, MAP_WIDTH, MAP_HEIGHT);
  
  // Player is always in the center of the visible map
  const playerPosition = { 
    x: Math.floor(MAP_WIDTH / 2), 
    y: Math.floor(MAP_HEIGHT / 2) 
  };

  // Initialize agents system
  const { agents, worldAgents, visibleAgents } = useAgents({
    playerWorldPosition: worldPosition,
    mapWidth: MAP_WIDTH,
    mapHeight: MAP_HEIGHT,
    viewRadius: VIEW_RADIUS
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
    
    // Update player direction and track recent movements
    setPlayerDirection(direction);
    setRecentMovements(prev => {
      const newMovements = [...prev, direction];
      return newMovements.slice(-5); // Keep last 5 movements
    });
  }, [generateTileAt, savePositionToRedis]);

  const toggleAutonomous = useCallback(() => {
    setIsAutonomous(prev => !prev);
  }, []);

  // Helper function to determine terrain type
  const getCurrentTerrain = useCallback(() => {
    const tileType = generateTileAt(worldPosition.x, worldPosition.y);
    switch (tileType) {
      case 0: return 'grass';
      case 1: return 'dirt';
      case 2: return 'water';
      case 3: return 'stone';
      default: return 'unknown';
    }
  }, [worldPosition, generateTileAt]);

  // Helper function to determine biome
  const getCurrentBiome = useCallback(() => {
    const biomeX = Math.floor(worldPosition.x / 20);
    const biomeY = Math.floor(worldPosition.y / 20);
    const biomeSeed = biomeX * 100 + biomeY;
    const biomeRandom = Math.abs(Math.sin(biomeSeed * 7.1234) * 23456.7891) % 1;
    
    if (biomeRandom < 0.3) return 'desert';
    else if (biomeRandom < 0.5) return 'water';
    else if (biomeRandom < 0.7) return 'mountain';
    return 'plains';
  }, [worldPosition]);

  // Generate AI commentary
  const generateAICommentary = useCallback(async () => {
    if (!isAutonomous) return;

    try {
      const gameState = {
        worldPosition,
        currentTerrain: getCurrentTerrain(),
        visibleAgents: visibleAgents.map(agent => ({ name: agent.name, color: agent.color })),
        recentMovements,
        biome: getCurrentBiome()
      };

      const response = await fetch('/api/commentary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gameState }),
      });

      if (response.ok) {
        const data = await response.json();
        setLastCommentary(data.commentary);
      }
    } catch (error) {
      console.error('Failed to generate commentary:', error);
    }
  }, [isAutonomous, worldPosition, getCurrentTerrain, visibleAgents, recentMovements, getCurrentBiome]);

  // Autonomous movement logic
  const movePlayerAutonomously = useCallback(() => {
    if (!isAutonomous) return;

    // Try to move in current direction
    const nextPosition = { ...worldPosition };
    switch (playerDirection) {
      case 'up':
        nextPosition.y -= 1;
        break;
      case 'down':
        nextPosition.y += 1;
        break;
      case 'left':
        nextPosition.x -= 1;
        break;
      case 'right':
        nextPosition.x += 1;
        break;
    }

    const tileType = generateTileAt(nextPosition.x, nextPosition.y);
    
    if (tileType === 3) { // If blocked, change direction
      // Try different directions
      const directions: ('up' | 'down' | 'left' | 'right')[] = ['up', 'down', 'left', 'right'];
      const availableDirections = directions.filter(dir => {
        const testPosition = { ...worldPosition };
        switch (dir) {
          case 'up':
            testPosition.y -= 1;
            break;
          case 'down':
            testPosition.y += 1;
            break;
          case 'left':
            testPosition.x -= 1;
            break;
          case 'right':
            testPosition.x += 1;
            break;
        }
        return generateTileAt(testPosition.x, testPosition.y) !== 3;
      });

      if (availableDirections.length > 0) {
        const randomDirection = availableDirections[Math.floor(Math.random() * availableDirections.length)];
        movePlayer(randomDirection);
      }
    } else {
      // Move in current direction
      movePlayer(playerDirection);
    }
  }, [isAutonomous, worldPosition, playerDirection, generateTileAt, movePlayer]);

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

  // Autonomous movement interval
  useEffect(() => {
    if (!isAutonomous) return;

    const interval = setInterval(movePlayerAutonomously, 1500); // Move every 1.5 seconds
    return () => clearInterval(interval);
  }, [isAutonomous, movePlayerAutonomously]);

  // Generate commentary periodically during autonomous mode
  useEffect(() => {
    if (!isAutonomous) return;

    // Generate initial commentary when autonomous mode starts
    generateAICommentary();

    // Generate commentary every 10 seconds during autonomous mode
    const commentaryInterval = setInterval(generateAICommentary, 10000);
    return () => clearInterval(commentaryInterval);
  }, [isAutonomous, generateAICommentary]);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (isLoading || isAutonomous) return; // Don't allow manual movement while loading or in autonomous mode
      
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
  }, [movePlayer, isLoading, isAutonomous]);

  return {
    playerPosition,
    mapData,
    worldPosition,
    movePlayer,
    isLoading,
    userId,
    agents,
    worldAgents,
    visibleAgents,
    isAutonomous,
    toggleAutonomous,
    lastCommentary
  };
}