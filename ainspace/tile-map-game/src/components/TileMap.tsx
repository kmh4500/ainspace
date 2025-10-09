'use client';

import { useEffect, useRef, useState } from 'react';

interface Agent {
  id: string;
  screenX: number;
  screenY: number;
  color: string;
  name: string;
}

type TileLayers = {
  layer0: { [key: string]: string };
  layer1: { [key: string]: string };
  layer2: { [key: string]: string };
};

interface TileMapProps {
  mapData: number[][];
  tileSize: number;
  playerPosition: { x: number; y: number };
  worldPosition: { x: number; y: number };
  agents?: Agent[];
  customTiles?: TileLayers | { [key: string]: string };
  layerVisibility?: { [key: number]: boolean };
  buildMode?: 'view' | 'paint';
  onTileClick?: (x: number, y: number) => void;
}

export default function TileMap({ 
  mapData, 
  tileSize, 
  playerPosition, 
  worldPosition,
  agents = [],
  customTiles = {},
  layerVisibility = { 0: true, 1: true, 2: true },
  buildMode = 'view',
  onTileClick
}: TileMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loadedImages, setLoadedImages] = useState<{ [key: string]: HTMLImageElement }>({});

  // Check if customTiles is using layer structure
  const isLayeredTiles = (tiles: any): tiles is TileLayers => {
    return tiles && typeof tiles === 'object' && ('layer0' in tiles || 'layer1' in tiles || 'layer2' in tiles);
  };

  // Load custom tile images
  useEffect(() => {
    let imagesToLoad: string[] = [];
    
    if (isLayeredTiles(customTiles)) {
      // Extract images from all layers
      Object.keys(customTiles).forEach(layerKey => {
        const layer = customTiles[layerKey as keyof TileLayers];
        if (layer) {
          imagesToLoad.push(...Object.values(layer));
        }
      });
    } else {
      // Legacy single layer support
      imagesToLoad = Object.values(customTiles);
    }
    
    const uniqueImages = [...new Set(imagesToLoad)];
    
    uniqueImages.forEach(imageUrl => {
      if (!loadedImages[imageUrl]) {
        const img = new Image();
        img.onload = () => {
          setLoadedImages(prev => ({
            ...prev,
            [imageUrl]: img
          }));
        };
        img.src = imageUrl;
      }
    });
  }, [customTiles, loadedImages]);

  // Handle canvas click for build mode
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (buildMode !== 'paint' || !onTileClick) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // Get click position relative to canvas, accounting for scaling
    const canvasX = (event.clientX - rect.left) * scaleX;
    const canvasY = (event.clientY - rect.top) * scaleY;
    
    // Convert to tile coordinates (screen space)
    const screenX = Math.floor(canvasX / tileSize);
    const screenY = Math.floor(canvasY / tileSize);
    
    // Check if click is within map bounds
    if (screenX >= 0 && screenX < mapData[0]?.length && screenY >= 0 && screenY < mapData.length) {
      // Convert screen coordinates to world coordinates
      const halfWidth = Math.floor(mapData[0]?.length / 2);
      const halfHeight = Math.floor(mapData.length / 2);
      const worldX = worldPosition.x - halfWidth + screenX;
      const worldY = worldPosition.y - halfHeight + screenY;
      
      onTileClick(worldX, worldY);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill background with light color
    ctx.fillStyle = '#f0f8ff'; // Light blue-white background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw base tiles
    for (let y = 0; y < mapData.length; y++) {
      for (let x = 0; x < mapData[y].length; x++) {
        const tileType = mapData[y][x];
        
        // Render void tiles as light background
        if (tileType === -1) {
          ctx.fillStyle = '#f0f8ff'; // Same as background
          ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
          continue;
        }
        
        // Set tile color based on type
        switch (tileType) {
          case 0:
            ctx.fillStyle = '#90EE90'; // Light green for grass
            break;
          case 1:
            ctx.fillStyle = '#8B4513'; // Brown for dirt
            break;
          case 2:
            ctx.fillStyle = '#4169E1'; // Blue for water
            break;
          case 3:
            ctx.fillStyle = '#696969'; // Gray for stone
            break;
          default:
            ctx.fillStyle = '#FFFFFF'; // White for unknown
        }

        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      }
    }
    
    // Draw custom tile layers
    const halfWidth = Math.floor(mapData[0]?.length / 2);
    const halfHeight = Math.floor(mapData.length / 2);
    
    if (isLayeredTiles(customTiles)) {
      // Draw each layer in order
      [0, 1, 2].forEach(layerIndex => {
        if (!layerVisibility[layerIndex]) return;
        
        const layerKey = `layer${layerIndex}` as keyof TileLayers;
        const layer = customTiles[layerKey];
        
        if (layer) {
          for (let y = 0; y < mapData.length; y++) {
            for (let x = 0; x < mapData[y].length; x++) {
              const worldX = worldPosition.x - halfWidth + x;
              const worldY = worldPosition.y - halfHeight + y;
              const tileKey = `${worldX},${worldY}`;
              const customTileImage = layer[tileKey];
              
              if (customTileImage && loadedImages[customTileImage]) {
                const img = loadedImages[customTileImage];
                ctx.drawImage(img, x * tileSize, y * tileSize, tileSize, tileSize);
              }
            }
          }
        }
      });
    } else {
      // Legacy single layer rendering
      for (let y = 0; y < mapData.length; y++) {
        for (let x = 0; x < mapData[y].length; x++) {
          const worldX = worldPosition.x - halfWidth + x;
          const worldY = worldPosition.y - halfHeight + y;
          const tileKey = `${worldX},${worldY}`;
          const customTileImage = customTiles[tileKey];
          
          if (customTileImage && loadedImages[customTileImage]) {
            const img = loadedImages[customTileImage];
            ctx.drawImage(img, x * tileSize, y * tileSize, tileSize, tileSize);
          }
        }
      }
    }

    // Draw agents
    agents.forEach(agent => {
      ctx.fillStyle = agent.color;
      ctx.fillRect(
        agent.screenX * tileSize + 4,
        agent.screenY * tileSize + 4,
        tileSize - 8,
        tileSize - 8
      );
      
      // Draw agent border
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.strokeRect(
        agent.screenX * tileSize + 4,
        agent.screenY * tileSize + 4,
        tileSize - 8,
        tileSize - 8
      );
    });

    // Draw player (on top of agents)
    ctx.fillStyle = '#FF0000'; // Red for player
    ctx.fillRect(
      playerPosition.x * tileSize + 2,
      playerPosition.y * tileSize + 2,
      tileSize - 4,
      tileSize - 4
    );
    
    // Draw player border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      playerPosition.x * tileSize + 2,
      playerPosition.y * tileSize + 2,
      tileSize - 4,
      tileSize - 4
    );

  }, [mapData, tileSize, playerPosition, agents, customTiles, loadedImages, layerVisibility]);

  return (
    <canvas
      ref={canvasRef}
      width={mapData[0]?.length * tileSize || 400}
      height={mapData.length * tileSize || 400}
      className="border border-gray-400 rounded-lg max-w-full"
      style={{
        background: '#f0f8ff',
        cursor: buildMode === 'paint' ? 'crosshair' : 'default'
      }}
      onClick={handleCanvasClick}
    />
  );
}