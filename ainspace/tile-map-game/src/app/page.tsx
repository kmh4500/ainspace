'use client';

import { useGameState } from '@/hooks/useGameState';
import { useState, useRef, useEffect } from 'react';
import { ChatBoxRef } from '@/components/ChatBox';
import MapTab from '@/components/tabs/MapTab';
import ThreadTab from '@/components/tabs/ThreadTab';
import BuildTab from '@/components/tabs/BuildTab';

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
          <MapTab
            isActive={activeTab === 'map'}
            playerPosition={playerPosition}
            mapData={mapData}
            worldPosition={worldPosition}
            visibleAgents={visibleAgents}
            publishedTiles={publishedTiles}
            customTiles={customTiles}
            isAutonomous={isAutonomous}
            onMobileMove={handleMobileMove}
            broadcastMessage={broadcastMessage}
            setBroadcastMessage={setBroadcastMessage}
            onBroadcast={handleBroadcast}
            broadcastStatus={broadcastStatus}
            threads={threads}
            onViewThread={handleViewThread}
            userId={userId}
            isLoading={isLoading}
            toggleAutonomous={toggleAutonomous}
          />
          
          <ThreadTab
            isActive={activeTab === 'thread'}
            chatBoxRef={chatBoxRef}
            lastCommentary={lastCommentary}
            worldAgents={worldAgents}
            worldPosition={worldPosition}
            currentThreadId={currentThreadId || undefined}
            threads={threads}
            onThreadSelect={setCurrentThreadId}
          />
          
          <BuildTab
            isActive={activeTab === 'build'}
            mapData={mapData}
            playerPosition={playerPosition}
            worldPosition={worldPosition}
            visibleAgents={visibleAgents}
            publishedTiles={publishedTiles}
            customTiles={customTiles}
            selectedImage={selectedImage}
            setSelectedImage={setSelectedImage}
            buildMode={buildMode}
            setBuildMode={setBuildMode}
            registeredImages={registeredImages}
            setRegisteredImages={setRegisteredImages}
            setCustomTiles={setCustomTiles}
            isPublishing={isPublishing}
            publishStatus={publishStatus}
            userId={userId}
            onPublishTiles={handlePublishTiles}
          />
        </div>
      </div>
    </div>
  );
}
