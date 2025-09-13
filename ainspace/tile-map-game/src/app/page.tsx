'use client';

import TileMap from '@/components/TileMap';
import ChatBox, { ChatBoxRef } from '@/components/ChatBox';
import { useGameState } from '@/hooks/useGameState';
import { useState, useRef, useEffect } from 'react';

export default function Home() {
  const { playerPosition, mapData, worldPosition, movePlayer, isLoading, userId, visibleAgents, agents, worldAgents, isAutonomous, toggleAutonomous, lastCommentary } = useGameState();
  const [activeTab, setActiveTab] = useState<'map' | 'thread' | 'build'>('map');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [threads, setThreads] = useState<{
    id: string;
    message: string;
    timestamp: Date;
    agentsReached: number;
    agentNames: string[];
  }[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [broadcastStatus, setBroadcastStatus] = useState<{
    range: number;
    agentsReached: number;
    agentNames: string[];
  } | null>(null);
  const chatBoxRef = useRef<ChatBoxRef>(null);
  
  // Build mode state
  const [customTiles, setCustomTiles] = useState<{
    [key: string]: string; // key: "x,y", value: image data URL
  }>({});
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [buildMode, setBuildMode] = useState<'select' | 'paint'>('select');
  const [registeredImages, setRegisteredImages] = useState<{
    [key: string]: string; // key: image name/id, value: image data URL
  }>({});
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [publishedTiles, setPublishedTiles] = useState<{
    [key: string]: string;
  }>({});

  // Load custom tiles when userId is available
  useEffect(() => {
    const loadCustomTiles = async () => {
      if (!userId) return;

      try {
        const response = await fetch(`/api/custom-tiles?userId=${userId}`);
        if (response.ok) {
          const data = await response.json();
          if (!data.isDefault && Object.keys(data.tiles).length > 0) {
            setPublishedTiles(data.tiles);
            console.log(`Loaded ${Object.keys(data.tiles).length} published tiles from server`);
          }
        }
      } catch (error) {
        console.error('Failed to load custom tiles:', error);
      }
    };

    loadCustomTiles();
  }, [userId]);

  const handleMobileMove = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (!isAutonomous) {
      movePlayer(direction);
    }
  };

  const handleBroadcast = async () => {
    if (broadcastMessage.trim()) {
      const messageText = broadcastMessage.trim();
      
      // Calculate agents within range (default broadcast range: 10 units)
      const broadcastRange = 10;
      const agentsInRange = worldAgents.filter(agent => {
        const distance = Math.sqrt(
          Math.pow(agent.x - worldPosition.x, 2) + 
          Math.pow(agent.y - worldPosition.y, 2)
        );
        return distance <= broadcastRange;
      });
      
      console.log('Broadcast setup:', {
        totalAgents: worldAgents.length,
        agentsInRange: agentsInRange.length,
        agentNames: agentsInRange.map(a => a.name),
        agentIds: agentsInRange.map(a => a.id)
      });
      
      // Set broadcast status
      setBroadcastStatus({
        range: broadcastRange,
        agentsReached: agentsInRange.length,
        agentNames: agentsInRange.map(agent => agent.name)
      });
      
      setBroadcastMessage('');
      
      // Only create thread and send message if there are agents in range
      if (agentsInRange.length > 0 && chatBoxRef.current) {
        // Create new thread with unique ID
        const threadId = `thread-${Date.now()}`;
        const newThread = {
          id: threadId,
          message: messageText,
          timestamp: new Date(),
          agentsReached: agentsInRange.length,
          agentNames: agentsInRange.map(agent => agent.name)
        };
        
        // Add to threads list and set as current thread
        setThreads(prev => [newThread, ...prev]);
        setCurrentThreadId(threadId);
        
        try {
          // Send the broadcast message through the ChatBox system with thread ID and radius
          await chatBoxRef.current.sendMessage(messageText, threadId, broadcastRange);
          console.log(`Broadcasting "${messageText}" to ${agentsInRange.length} agents in thread ${threadId}:`, agentsInRange.map(a => a.name));
        } catch (error) {
          console.error('Failed to broadcast message:', error);
        }
      } else {
        console.log(`No agents in range - broadcast message "${messageText}" not sent, no thread created`);
      }
      
      // Clear broadcast status after 5 seconds
      setTimeout(() => {
        setBroadcastStatus(null);
      }, 5000);
    }
  };

  const handleViewThread = (threadId?: string) => {
    // Set current thread if specified, otherwise use most recent
    if (threadId) {
      setCurrentThreadId(threadId);
    } else if (threads.length > 0) {
      setCurrentThreadId(threads[0].id);
    }
    // Switch to thread tab to view the conversation
    setActiveTab('thread');
  };

  const handlePublishTiles = async () => {
    if (!userId || Object.keys(customTiles).length === 0) {
      setPublishStatus({
        type: 'error',
        message: 'No custom tiles to publish'
      });
      return;
    }

    setIsPublishing(true);
    setPublishStatus(null);

    try {
      const response = await fetch('/api/custom-tiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          customTiles: customTiles
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setPublishStatus({
        type: 'success',
        message: `Published ${data.tileCount} custom tiles successfully!`
      });

      // Move custom tiles to published tiles and reset build state
      setPublishedTiles(prev => ({ ...prev, ...customTiles }));
      setCustomTiles({}); // Clear draft tiles since they're now published
      setSelectedImage(null);
      setBuildMode('select');
      // Note: Don't clear registeredImages - they should persist

      // Clear status after 5 seconds
      setTimeout(() => {
        setPublishStatus(null);
      }, 5000);

    } catch (error) {
      console.error('Failed to publish custom tiles:', error);
      setPublishStatus({
        type: 'error',
        message: 'Failed to publish tiles. Please try again.'
      });

      // Clear status after 5 seconds
      setTimeout(() => {
        setPublishStatus(null);
      }, 5000);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="max-w-md mx-auto flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white p-4 shadow-sm">
          <h1 className="text-xl font-bold text-center text-gray-800">
            AIN Space
          </h1>
        </div>
        
        {/* Tab Navigation */}
        <div className="bg-white border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('map')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'map'
                  ? 'bg-blue-600 text-white border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              🗺️ Map
            </button>
            <button
              onClick={() => setActiveTab('thread')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'thread'
                  ? 'bg-blue-600 text-white border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              💬 Thread
            </button>
            <button
              onClick={() => setActiveTab('build')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'build'
                  ? 'bg-orange-600 text-white border-b-2 border-orange-600'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              🔨 Build
            </button>
          </div>
        </div>
        
        {/* Tab Content */}
        <div className="flex-1 bg-white relative">
          {/* Map Tab Content */}
          <div className={`h-full p-4 flex flex-col ${activeTab !== 'map' ? 'hidden' : ''}`}>
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
                    onClick={() => handleMobileMove('up')}
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
                    onClick={() => handleMobileMove('left')}
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
                    onClick={() => handleMobileMove('down')}
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
                    onClick={() => handleMobileMove('right')}
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
                        onClick={() => handleViewThread(threads[0].id)}
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
                    onKeyPress={(e) => e.key === 'Enter' && handleBroadcast()}
                    placeholder="Type broadcast message..."
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleBroadcast}
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
          </div>
          
          {/* Thread Tab Content - Always rendered but conditionally visible */}
          <div className={`h-full ${activeTab !== 'thread' ? 'hidden' : ''}`}>
            <ChatBox 
              ref={chatBoxRef}
              className="h-full" 
              aiCommentary={lastCommentary}
              agents={worldAgents}
              playerWorldPosition={worldPosition}
              currentThreadId={currentThreadId || undefined}
              threads={threads}
              onThreadSelect={setCurrentThreadId}
            />
          </div>
          
          {/* Build Tab Content */}
          <div className={`h-full ${activeTab !== 'build' ? 'hidden' : ''}`}>
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
                        onClick={handlePublishTiles}
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
          </div>
        </div>
      </div>
    </div>
  );
}
