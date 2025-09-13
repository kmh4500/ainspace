import React from 'react';
import TileMap from '@/components/TileMap';
import BaseTabContent from './BaseTabContent';

interface BuildTabProps {
  isActive: boolean;
  mapData: number[][];
  playerPosition: { x: number; y: number };
  worldPosition: { x: number; y: number };
  visibleAgents: any[];
  publishedTiles: { [key: string]: string };
  customTiles: { [key: string]: string };
  selectedImage: string | null;
  setSelectedImage: (image: string | null) => void;
  buildMode: 'select' | 'paint';
  setBuildMode: (mode: 'select' | 'paint') => void;
  registeredImages: { [key: string]: string };
  setRegisteredImages: (images: { [key: string]: string } | ((prev: { [key: string]: string }) => { [key: string]: string })) => void;
  setCustomTiles: (tiles: { [key: string]: string } | ((prev: { [key: string]: string }) => { [key: string]: string })) => void;
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
  registeredImages,
  setRegisteredImages,
  setCustomTiles,
  isPublishing,
  publishStatus,
  userId,
  onPublishTiles
}: BuildTabProps) {
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
          {/* Image Upload */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Upload Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const dataUrl = event.target?.result as string;
                    const imageId = `img-${Date.now()}-${file.name}`;
                    
                    // Add to registered images
                    setRegisteredImages(prev => ({
                      ...prev,
                      [imageId]: dataUrl
                    }));
                    
                    setSelectedImage(dataUrl);
                    setBuildMode('paint'); // Auto-switch to paint mode
                  };
                  reader.readAsDataURL(file);
                }
              }}
              className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
            />
          </div>
          
          {/* Registered Images */}
          {Object.keys(registeredImages).length > 0 && (
            <div className="bg-white p-2 rounded border">
              <p className="text-xs font-medium text-gray-700 mb-2">📂 Registered Images ({Object.keys(registeredImages).length})</p>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(registeredImages).map(([imageId, dataUrl]) => (
                  <div key={imageId} className="relative group">
                    <button
                      onClick={() => {
                        setSelectedImage(dataUrl);
                        setBuildMode('paint');
                      }}
                      className={`w-full aspect-square border rounded overflow-hidden hover:ring-2 hover:ring-orange-300 transition-all ${
                        selectedImage === dataUrl
                          ? 'ring-2 ring-orange-500'
                          : 'border-gray-300'
                      }`}
                    >
                      <img 
                        src={dataUrl} 
                        alt="Registered" 
                        className="w-full h-full object-cover"
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Selected Image Preview & Controls */}
          {selectedImage && (
            <div className="bg-white p-2 rounded border">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-8 h-8 border border-orange-300 rounded overflow-hidden flex-shrink-0">
                  <img 
                    src={selectedImage} 
                    alt="Selected" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-600">Ready to paint tiles</p>
                </div>
              </div>
              
              {/* Build Mode Toggle */}
              <div className="flex space-x-2">
                <button
                  onClick={() => setBuildMode('select')}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    buildMode === 'select'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  📁 Select
                </button>
                <button
                  onClick={() => setBuildMode('paint')}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    buildMode === 'paint'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  🎨 Paint
                </button>
                <button
                  onClick={() => {
                    setSelectedImage(null);
                    setBuildMode('select');
                  }}
                  className="px-2 py-1 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 transition-colors"
                >
                  ❌ Clear
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
              customTiles={{ ...publishedTiles, ...customTiles }}
              buildMode={buildMode === 'paint' && selectedImage ? 'paint' : 'view'}
              onTileClick={(worldX, worldY) => {
                if (buildMode === 'paint' && selectedImage) {
                  const key = `${worldX},${worldY}`;
                  setCustomTiles(prev => ({
                    ...prev,
                    [key]: selectedImage
                  }));
                }
              }}
            />
          </div>
          
          {/* Instructions */}
          <div className="text-center text-xs text-gray-600 space-y-1 mb-3">
            {buildMode === 'select' ? (
              <p>📁 Upload an image to start customizing tiles</p>
            ) : selectedImage ? (
              <>
                <p>🎨 Click on tiles to paint them with your image</p>
                <p className="text-gray-500">Tip: Each click replaces that tile with your image</p>
              </>
            ) : (
              <p>⚠️ Select an image first to start painting tiles</p>
            )}
          </div>
          
          {/* Custom Tiles Management - Below Map */}
          {Object.keys(customTiles).length > 0 && !publishStatus && (
            <div className="bg-blue-50 p-3 rounded border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700">
                  🎨 {Object.keys(customTiles).length} custom tile{Object.keys(customTiles).length !== 1 ? 's' : ''} ready
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
                  onClick={() => setCustomTiles({})}
                  className="px-4 py-2 bg-red-500 text-white rounded text-sm font-medium hover:bg-red-600 transition-colors"
                >
                  🗑️ Clear All
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
      </div>
    </BaseTabContent>
  );
}