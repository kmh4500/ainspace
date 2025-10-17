import React, { useState, useRef, useEffect } from 'react';
import NextImage from 'next/image';
import TileMap from '@/components/TileMap';
import BaseTabContent from './BaseTabContent';

type TileLayers = {
  layer0: { [key: string]: string };
  layer1: { [key: string]: string };
  layer2: { [key: string]: string };
};

interface BuildTabProps {
  isActive: boolean;
  mapData: number[][];
  playerPosition: { x: number; y: number };
  worldPosition: { x: number; y: number };
  visibleAgents: Array<{
    id: string;
    screenX: number;
    screenY: number;
    color: string;
    name: string;
  }>;
  publishedTiles: TileLayers;
  customTiles: TileLayers;
  selectedImage: string | null;
  setSelectedImage: (image: string | null) => void;
  buildMode: 'select' | 'paint';
  setBuildMode: (mode: 'select' | 'paint') => void;
  setCustomTiles: (tiles: TileLayers | ((prev: TileLayers) => TileLayers)) => void;
  isPublishing: boolean;
  publishStatus: {
    type: 'success' | 'error';
    message: string;
  } | null;
  userId: string | null;
  onPublishTiles: () => void;
}

export default function BuildTab({
  isActive,
  mapData,
  playerPosition,
  worldPosition,
  visibleAgents,
  publishedTiles,
  customTiles,
  selectedImage,
  setSelectedImage,
  buildMode,
  setBuildMode,
  setCustomTiles,
  isPublishing,
  publishStatus,
  userId,
  onPublishTiles
}: BuildTabProps) {
  const [tilesetImage, setTilesetImage] = useState<string | null>(null);
  const [extractedTiles, setExtractedTiles] = useState<string[]>([]);
  const [selectedTileIndex, setSelectedTileIndex] = useState<number | null>(null);
  const [selectedTiles, setSelectedTiles] = useState<{
    tiles: string[];
    width: number;
    height: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ x: number; y: number } | null>(null);
  const [selection, setSelection] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [tileSize, setTileSize] = useState<number>(64);
  const [imageScale, setImageScale] = useState<{ width: number; height: number } | null>(null);
  const [activeLayer, setActiveLayer] = useState<0 | 1 | 2>(0);
  const [layerVisibility, setLayerVisibility] = useState<{ [key: number]: boolean }>({ 0: true, 1: true, 2: true });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const imgElementRef = useRef<HTMLImageElement>(null);

  // Helper function to upload tile to Vercel Blob
  const uploadTileToBlob = async (dataUrl: string): Promise<string> => {
    // Convert data URL to Blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Create unique tile ID
    const tileId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Upload to Vercel Blob
    const formData = new FormData();
    formData.append('file', blob, `${tileId}.png`);
    formData.append('tileId', tileId);

    const uploadResponse = await fetch('/api/upload-tile', {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload tile');
    }

    const { url } = await uploadResponse.json();
    return url;
  };

  // Extract tiles from tileset image with 16x16 tile size
  const extractTilesFromTileset = async (imageDataUrl: string) => {
    const img = new Image();
    img.onload = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Calculate grid based on selected tile size
      const cols = Math.floor(img.width / tileSize);
      const rows = Math.floor(img.height / tileSize);

      const tileWidth = tileSize;
      const tileHeight = tileSize;
      const tiles: string[] = [];

      canvas.width = tileWidth;
      canvas.height = tileHeight;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          ctx.clearRect(0, 0, tileWidth, tileHeight);
          ctx.drawImage(
            img,
            col * tileWidth, row * tileHeight, tileWidth, tileHeight,
            0, 0, tileWidth, tileHeight
          );

          // Upload tile to Vercel Blob and get URL
          try {
            const dataUrl = canvas.toDataURL();
            const blobUrl = await uploadTileToBlob(dataUrl);
            tiles.push(blobUrl);
          } catch (error) {
            console.error('Failed to upload tile:', error);
            // Fallback to data URL if upload fails
            tiles.push(canvas.toDataURL());
          }
        }
      }

      setExtractedTiles(tiles);
    };
    img.src = imageDataUrl;
  };

  // Cycle to next tile when clicking same tile
  const getNextTileIndex = (currentIndex: number, totalTiles: number) => {
    return (currentIndex + 1) % totalTiles;
  };

  // Extract selected area as tiles
  const extractSelectedTiles = async () => {
    if (!selection || !tilesetImage) return;

    const img = new Image();
    img.onload = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Calculate tile dimensions based on selection
      const cols = selection.width / tileSize;
      const rows = selection.height / tileSize;

      const tiles: string[] = [];

      canvas.width = tileSize;
      canvas.height = tileSize;

      // Extract each tile from the selection
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          ctx.clearRect(0, 0, tileSize, tileSize);

          const sourceX = selection.x + col * tileSize;
          const sourceY = selection.y + row * tileSize;

          // Draw the tile
          ctx.drawImage(
            img,
            sourceX, sourceY, tileSize, tileSize,
            0, 0, tileSize, tileSize
          );

          // Upload tile to Vercel Blob and get URL
          try {
            const dataUrl = canvas.toDataURL();
            const blobUrl = await uploadTileToBlob(dataUrl);
            tiles.push(blobUrl);
          } catch (error) {
            console.error('Failed to upload tile:', error);
            // Fallback to data URL if upload fails
            tiles.push(canvas.toDataURL());
          }
        }
      }

      // Update selected tiles
      setSelectedTiles({
        tiles,
        width: cols,
        height: rows
      });

      setBuildMode('paint');
    };
    img.src = tilesetImage;
  };

  // Get scale ratio for coordinate conversion
  const getScale = () => {
    if (!imgElementRef.current || !imageScale) return { x: 1, y: 1 };
    return {
      x: imgElementRef.current.naturalWidth / imageScale.width,
      y: imgElementRef.current.naturalHeight / imageScale.height
    };
  };


  // Handle mouse events for selection
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setDragStart({ x, y });
    setDragEnd({ x, y });
    setIsDragging(true);
    setSelection(null);
    setSelectedTiles(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStart) return;
    
    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setDragEnd({ x, y });
  };

  const handleMouseUp = () => {
    if (!isDragging || !dragStart || !dragEnd) return;

    // Convert display coordinates to image coordinates
    const scale = getScale();
    const startX = dragStart.x * scale.x;
    const startY = dragStart.y * scale.y;
    const endX = dragEnd.x * scale.x;
    const endY = dragEnd.y * scale.y;

    const minX = Math.min(startX, endX);
    const minY = Math.min(startY, endY);
    const maxX = Math.max(startX, endX);
    const maxY = Math.max(startY, endY);

    // Snap to tile grid in image coordinates
    const snappedX = Math.floor(minX / tileSize) * tileSize;
    const snappedY = Math.floor(minY / tileSize) * tileSize;
    const snappedWidth = Math.ceil((maxX - snappedX) / tileSize) * tileSize;
    const snappedHeight = Math.ceil((maxY - snappedY) / tileSize) * tileSize;

    setSelection({
      x: snappedX,
      y: snappedY,
      width: snappedWidth,
      height: snappedHeight
    });

    setIsDragging(false);
  };

  useEffect(() => {
    if (tilesetImage) {
      extractTilesFromTileset(tilesetImage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tilesetImage, tileSize]);

  // Don't auto-extract tiles immediately - wait for user confirmation
  // This is now triggered by a button click instead

  return (
    <BaseTabContent isActive={isActive} withPadding={false}>
      <div className="h-full flex flex-col">
        {/* Build Header */}
        <div className="bg-orange-600 text-white p-3 flex-shrink-0">
          <h3 className="font-semibold text-sm">🔨 Build Mode</h3>
          <p className="text-xs text-orange-200 mt-1">Upload images and click tiles to customize your map</p>
        </div>
        
        {/* Build Controls */}
        <div className="p-3 border-b bg-gray-50 flex-shrink-0 space-y-3">
          {/* Layer Controls */}
          <div className="bg-white p-2 rounded border">
            <p className="text-xs font-medium text-gray-700 mb-2">Layer Controls</p>
            <div className="flex items-center space-x-2">
              <div className="flex-1 flex space-x-1">
                {[0, 1, 2].map((layer) => (
                  <button
                    key={layer}
                    onClick={() => setActiveLayer(layer as 0 | 1 | 2)}
                    className={`flex-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                      activeLayer === layer
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Layer {layer}
                  </button>
                ))}
              </div>
              <div className="flex space-x-1">
                {[0, 1, 2].map((layer) => (
                  <button
                    key={layer}
                    onClick={() => setLayerVisibility(prev => ({ ...prev, [layer]: !prev[layer] }))}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                      layerVisibility[layer]
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                    title={`Toggle layer ${layer} visibility`}
                  >
                    👁️
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Active: Layer {activeLayer}</p>
          </div>
          

          {/* Tileset Upload */}
          <div className="bg-white p-3 rounded border space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Upload Tileset PNG
              </label>
              <input
                type="file"
                accept="image/png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const dataUrl = event.target?.result as string;
                      setTilesetImage(dataUrl);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
              />
            </div>
            
            {tilesetImage && (
              <>
                <div>
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Tile Size (pixels)
                    </label>
                    <select
                      value={tileSize}
                      onChange={(e) => {
                        const newSize = parseInt(e.target.value);
                        setTileSize(newSize);
                        setSelection(null);
                        setSelectedTiles(null);
                      }}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                    >
                      <option value="16">16×16</option>
                      <option value="32">32×32</option>
                      <option value="64">64×64</option>
                      <option value="128">128×128</option>
                    </select>
                  </div>
                  
                  <p className="text-xs font-medium text-gray-700 mb-2">
                    Drag to select area from tileset
                  </p>
                  <div 
                    ref={imageRef}
                    className="relative max-w-full overflow-auto border rounded bg-gray-100"
                    style={{ maxHeight: '400px' }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={() => {
                      if (isDragging) {
                        handleMouseUp();
                      }
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      ref={imgElementRef}
                      src={tilesetImage}
                      alt="Tileset"
                      className="block"
                      draggable={false}
                      style={{ userSelect: 'none' }}
                      onLoad={(e) => {
                        const img = e.currentTarget;
                        setImageScale({
                          width: img.width,
                          height: img.height
                        });
                      }}
                    />
                    
                    {/* Selection overlay */}
                    {isDragging && dragStart && dragEnd && (
                      <div
                        className="absolute border-2 border-blue-500 bg-blue-200 opacity-50"
                        style={{
                          left: Math.min(dragStart.x, dragEnd.x),
                          top: Math.min(dragStart.y, dragEnd.y),
                          width: Math.abs(dragEnd.x - dragStart.x),
                          height: Math.abs(dragEnd.y - dragStart.y),
                          pointerEvents: 'none'
                        }}
                      />
                    )}
                    
                    {/* Saved selection - convert from image coords to display coords */}
                    {selection && !isDragging && imageScale && imgElementRef.current && (
                      <div
                        className="absolute border-2 border-green-500 bg-green-200 opacity-30"
                        style={{
                          left: (selection.x / imgElementRef.current.naturalWidth) * imageScale.width,
                          top: (selection.y / imgElementRef.current.naturalHeight) * imageScale.height,
                          width: (selection.width / imgElementRef.current.naturalWidth) * imageScale.width,
                          height: (selection.height / imgElementRef.current.naturalHeight) * imageScale.height,
                          pointerEvents: 'none'
                        }}
                      />
                    )}
                    
                    {/* Grid overlay - scale with image */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        backgroundImage: `repeating-linear-gradient(0deg, rgba(0,0,0,0.1) 0, rgba(0,0,0,0.1) 1px, transparent 1px, transparent ${imageScale ? (tileSize * imageScale.width / (imgElementRef.current?.naturalWidth || 1)) : tileSize}px), repeating-linear-gradient(90deg, rgba(0,0,0,0.1) 0, rgba(0,0,0,0.1) 1px, transparent 1px, transparent ${imageScale ? (tileSize * imageScale.width / (imgElementRef.current?.naturalWidth || 1)) : tileSize}px)`,
                        backgroundSize: `${imageScale ? (tileSize * imageScale.width / (imgElementRef.current?.naturalWidth || 1)) : tileSize}px ${imageScale ? (tileSize * imageScale.height / (imgElementRef.current?.naturalHeight || 1)) : tileSize}px`
                      }}
                    />
                  </div>
                  
                  {selection && (
                    <div className="mt-2 space-y-2">
                      <p className="text-xs text-green-600">
                        Selected: {selection.width / tileSize} × {selection.height / tileSize} tiles
                      </p>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            extractSelectedTiles();
                          }}
                          className="flex-1 px-3 py-2 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600 transition-colors"
                        >
                          ✂️ Extract Tiles ({(selection.width / tileSize) * (selection.height / tileSize)} tiles)
                        </button>
                        <button
                          onClick={() => {
                            setSelection(null);
                            setSelectedTiles(null);
                          }}
                          className="px-3 py-2 bg-gray-200 text-gray-700 rounded text-xs font-medium hover:bg-gray-300 transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          
          {/* Selected Tile Info */}
          {(selectedImage || selectedTiles) && (
            <div className="bg-orange-50 p-2 rounded border border-orange-200">
              <div className="flex items-center space-x-2">
                {selectedTiles ? (
                  <>
                    <div className="flex-shrink-0">
                      <p className="text-xs text-blue-700 font-medium">
                        📐 {selectedTiles.width} × {selectedTiles.height} tiles selected
                      </p>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-orange-700">Click on map to place pattern</p>
                    </div>
                  </>
                ) : selectedImage && (
                  <>
                    <div className="w-6 h-6 border border-orange-300 rounded overflow-hidden flex-shrink-0">
                      <NextImage
                        src={selectedImage}
                        alt="Selected"
                        width={24}
                        height={24}
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-orange-700 font-medium">🎨 Click tiles on map to paint</p>
                    </div>
                  </>
                )}
                <button
                  onClick={() => {
                    setSelectedImage(null);
                    setSelectedTileIndex(null);
                    setSelectedTiles(null);
                  }}
                  className="px-2 py-1 bg-orange-500 text-white rounded text-xs font-medium hover:bg-orange-600 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Build Map Area */}
        <div className="flex-1 p-3 overflow-auto">
          <div className="flex justify-center mb-2">
            <TileMap 
              mapData={mapData}
              tileSize={32}
              playerPosition={playerPosition}
              worldPosition={worldPosition}
              agents={visibleAgents}
              customTiles={{
                layer0: { ...(publishedTiles.layer0 || {}), ...(customTiles.layer0 || {}) },
                layer1: { ...(publishedTiles.layer1 || {}), ...(customTiles.layer1 || {}) },
                layer2: { ...(publishedTiles.layer2 || {}), ...(customTiles.layer2 || {}) }
              }}
              layerVisibility={layerVisibility}
              buildMode={buildMode === 'paint' && (selectedImage || selectedTiles) ? 'paint' : 'view'}
              onTileClick={(worldX, worldY) => {
                if (buildMode === 'paint') {
                  const layerKey = `layer${activeLayer}` as keyof TileLayers;
                  
                  if (selectedTiles && selectedTiles.tiles.length > 0) {
                    // Place multiple tiles in a pattern
                    const updates: { [key: string]: string } = {};
                    
                    // Place each tile from the selected tiles array
                    for (let row = 0; row < selectedTiles.height; row++) {
                      for (let col = 0; col < selectedTiles.width; col++) {
                        const tileIndex = row * selectedTiles.width + col;
                        if (tileIndex < selectedTiles.tiles.length) {
                          const targetX = worldX + col;
                          const targetY = worldY + row;
                          const targetKey = `${targetX},${targetY}`;
                          
                          updates[targetKey] = selectedTiles.tiles[tileIndex];
                        }
                      }
                    }
                    
                    setCustomTiles(prev => ({
                      ...prev,
                      [layerKey]: {
                        ...(prev[layerKey] || {}),
                        ...updates
                      }
                    }));
                  } else if (selectedImage) {
                    // Single tile placement with cycling
                    const key = `${worldX},${worldY}`;
                    const currentTile = (customTiles[layerKey] || {})[key] || (publishedTiles[layerKey] || {})[key];
                    
                    if (currentTile === selectedImage && selectedTileIndex !== null && extractedTiles.length > 0) {
                      // If clicking same tile image, cycle to next tile
                      const nextIndex = getNextTileIndex(selectedTileIndex, extractedTiles.length);
                      const nextTile = extractedTiles[nextIndex];
                      
                      setSelectedImage(nextTile);
                      setSelectedTileIndex(nextIndex);
                      setCustomTiles(prev => ({
                        ...prev,
                        [layerKey]: {
                          ...(prev[layerKey] || {}),
                          [key]: nextTile
                        }
                      }));
                    } else {
                      // Otherwise, just set the selected image
                      setCustomTiles(prev => ({
                        ...prev,
                        [layerKey]: {
                          ...(prev[layerKey] || {}),
                          [key]: selectedImage
                        }
                      }));
                    }
                  }
                }
              }}
            />
          </div>
          
          {/* Instructions */}
          <div className="text-center text-xs text-gray-600 space-y-1 mb-3">
            {!tilesetImage ? (
              <p>🧩 Upload a tileset PNG and configure grid size to extract individual tiles</p>
            ) : extractedTiles.length === 0 ? (
              <p>⚙️ Adjust grid size to extract tiles from your uploaded image</p>
            ) : selectedTiles ? (
              <>
                <p>📐 Click on map to place {selectedTiles.width}×{selectedTiles.height} pattern</p>
                <p className="text-gray-500">Tip: The pattern will maintain its layout from the tileset</p>
              </>
            ) : selectedImage ? (
              <>
                <p>🎨 Click map tiles to paint • Click same tile to cycle next</p>
                <p className="text-gray-500">Tip: Keep clicking the same spot to browse through tileset</p>
              </>
            ) : (
              <p>👆 Click on a tile above to start painting</p>
            )}
          </div>
          
          {/* Custom Tiles Management - Below Map */}
          {Object.keys(customTiles[`layer${activeLayer}` as keyof TileLayers] || {}).length > 0 && !publishStatus && (
            <div className="bg-blue-50 p-3 rounded border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700">
                  🎨 Layer {activeLayer}: {Object.keys(customTiles[`layer${activeLayer}` as keyof TileLayers] || {}).length} custom tile{Object.keys(customTiles[`layer${activeLayer}` as keyof TileLayers] || {}).length !== 1 ? 's' : ''} ready
                </span>
              </div>
              <div className="flex space-x-2 justify-center">
                <button
                  onClick={onPublishTiles}
                  disabled={isPublishing || !userId}
                  className="px-4 py-2 bg-green-500 text-white rounded text-sm font-medium hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isPublishing ? '📤 Publishing...' : '📤 Publish Tiles'}
                </button>
                <button
                  onClick={() => {
                    const layerKey = `layer${activeLayer}` as keyof TileLayers;
                    setCustomTiles(prev => ({
                      layer0: prev.layer0 || {},
                      layer1: prev.layer1 || {},
                      layer2: prev.layer2 || {},
                      [layerKey]: {}
                    }));
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded text-sm font-medium hover:bg-red-600 transition-colors"
                >
                  🗑️ Clear Layer {activeLayer}
                </button>
              </div>
              <p className="text-xs text-blue-600 text-center mt-2">These tiles will be saved to your world permanently</p>
            </div>
          )}
          
          {/* Publish Status - Below Map */}
          {publishStatus && (
            <div className={`p-3 rounded border text-sm ${
              publishStatus.type === 'success' 
                ? 'bg-green-50 border-green-200 text-green-700' 
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <div className="flex items-center justify-center">
                <span className="mr-2 text-lg">
                  {publishStatus.type === 'success' ? '✅' : '❌'}
                </span>
                {publishStatus.message}
              </div>
            </div>
          )}
        </div>
        
        {/* Hidden canvas for tile extraction */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </BaseTabContent>
  );
}