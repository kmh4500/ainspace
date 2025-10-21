'use client';

import { useGameState } from '@/hooks/useGameState';
import { useState, useRef, useEffect } from 'react';
import { ChatBoxRef } from '@/components/ChatBox';
import MapTab from '@/components/tabs/MapTab';
import ThreadTab from '@/components/tabs/ThreadTab';
import BuildTab from '@/components/tabs/BuildTab';
import AgentTab from '@/components/tabs/AgentTab';
import { AgentCard } from '@a2a-js/sdk';
import { AgentState } from '@/lib/agent';

export default function Home() {
  const { playerPosition, mapData, worldPosition, movePlayer, isLoading, userId, visibleAgents, worldAgents, isAutonomous, toggleAutonomous, lastCommentary } = useGameState();
  const [activeTab, setActiveTab] = useState<'map' | 'thread' | 'build' | 'agent'>('map');
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
  type TileLayers = {
    layer0: { [key: string]: string };
    layer1: { [key: string]: string };
    layer2: { [key: string]: string };
  };

  const [customTiles, setCustomTiles] = useState<TileLayers>({
    layer0: {},
    layer1: {},
    layer2: {}
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [buildMode, setBuildMode] = useState<'select' | 'paint'>('select');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [publishedTiles, setPublishedTiles] = useState<TileLayers>({
    layer0: {},
    layer1: {},
    layer2: {}
  });

  // A2A Agent management state
  const [spawnedA2AAgents, setSpawnedA2AAgents] = useState<{
    [agentUrl: string]: AgentState
  }>({});

  // Load custom tiles when userId is available
  useEffect(() => {
    const loadCustomTiles = async () => {
      if (!userId) return;

      try {
        const response = await fetch(`/api/custom-tiles?userId=${userId}`);
        if (response.ok) {
          const data = await response.json();
          if (!data.isDefault && data.tiles) {
            setPublishedTiles(data.tiles);
            const totalTiles = Object.keys(data.tiles.layer0 || {}).length + 
                              Object.keys(data.tiles.layer1 || {}).length + 
                              Object.keys(data.tiles.layer2 || {}).length;
            console.log(`Loaded ${totalTiles} published tiles from server`);
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
      const agentsInRange = combinedWorldAgents.filter(agent => {
        const distance = Math.sqrt(
          Math.pow(agent.x - worldPosition.x, 2) + 
          Math.pow(agent.y - worldPosition.y, 2)
        );
        return distance <= broadcastRange;
      });

      console.log('Broadcast setup:', {
        totalAgents: combinedWorldAgents.length,
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
      
      // Create thread and send message if there are agents in range
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
          // This now handles both regular and A2A agents through the unified system
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
    const totalCustomTiles = Object.keys(customTiles.layer0 || {}).length + 
                            Object.keys(customTiles.layer1 || {}).length + 
                            Object.keys(customTiles.layer2 || {}).length;
    
    if (!userId || totalCustomTiles === 0) {
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
      setPublishedTiles(prev => ({
        layer0: { ...(prev.layer0 || {}), ...(customTiles.layer0 || {}) },
        layer1: { ...(prev.layer1 || {}), ...(customTiles.layer1 || {}) },
        layer2: { ...(prev.layer2 || {}), ...(customTiles.layer2 || {}) }
      }));
      setCustomTiles({ layer0: {}, layer1: {}, layer2: {} }); // Clear draft tiles since they're now published
      setSelectedImage(null);
      setBuildMode('select');

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

  // A2A Agent handlers - now integrated into worldAgents
  const handleSpawnAgent = (importedAgent: { url: string; card: AgentCard }) => {
    const agentId = `a2a-${Date.now()}`;
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    // Spawn near player position
    const spawnX = worldPosition.x + Math.floor(Math.random() * 6) - 3;
    const spawnY = worldPosition.y + Math.floor(Math.random() * 6) - 3;

    // Add to spawned A2A agents for UI tracking
    setSpawnedA2AAgents(prev => ({
      ...prev,
      [importedAgent.url]: {
        id: agentId,
        name: importedAgent.card.name || 'A2A Agent',
        x: spawnX,
        y: spawnY,
        color: randomColor,
        agentUrl: importedAgent.url,
        behavior: 'A2A Agent',
        lastMoved: Date.now(),
        skills: importedAgent.card.skills || []
      }
    }));
  };

  const handleRemoveAgentFromMap = (agentUrl: string) => {
    setSpawnedA2AAgents(prev => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [agentUrl]: removed, ...rest } = prev;
      return rest;
    });
  };

  // Combine existing world agents with spawned A2A agents
  const combinedWorldAgents = [
    ...worldAgents,
    ...Object.values(spawnedA2AAgents).map(agent => ({
      id: agent.id,
      x: agent.x,
      y: agent.y,
      color: agent.color,
      name: agent.name,
      behavior: 'A2A Agent',
      agentUrl: agent.agentUrl, // Include agentUrl for A2A agents
      skills: agent.skills
    }))
  ];

  // Convert A2A agents to visible agents format for the map
  const a2aVisibleAgents = Object.values(spawnedA2AAgents)
    .map(agent => {
      const screenX = agent.x - worldPosition.x + Math.floor(mapData[0]?.length / 2);
      const screenY = agent.y - worldPosition.y + Math.floor(mapData.length / 2);
      
      // Only show if within visible area
      if (screenX >= 0 && screenX < mapData[0]?.length && screenY >= 0 && screenY < mapData.length) {
        return {
          id: agent.id,
          screenX,
          screenY,
          color: agent.color,
          name: agent.name
        };
      }
      return null;
    })
    .filter(Boolean) as Array<{
      id: string;
      screenX: number;
      screenY: number;
      color: string;
      name: string;
    }>;

  const combinedVisibleAgents = [...visibleAgents, ...a2aVisibleAgents];

  // A2A Agent movement system
  useEffect(() => {
    const moveA2AAgents = () => {
      setSpawnedA2AAgents(prev => {
        const now = Date.now();
        const updated = { ...prev };
        
        Object.values(updated).forEach(agent => {
          // Move agents every 5-10 seconds randomly
          if (agent.lastMoved && now - agent.lastMoved > 5000 + Math.random() * 5000) {
            const directions = [
              { dx: 0, dy: -1 }, // up
              { dx: 0, dy: 1 },  // down
              { dx: -1, dy: 0 }, // left
              { dx: 1, dy: 0 },  // right
            ];
            
            const direction = directions[Math.floor(Math.random() * directions.length)];
            const newX = agent.x + direction.dx;
            const newY = agent.y + direction.dy;
            
            // Simple boundary check (agents can move anywhere)
            agent.x = newX;
            agent.y = newY;
            agent.lastMoved = now;
          }
        });
        
        return updated;
      });
    };

    const interval = setInterval(moveA2AAgents, 2000); // Check every 2 seconds
    return () => clearInterval(interval);
  }, []);

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
            <button
              onClick={() => setActiveTab('agent')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'agent'
                  ? 'bg-purple-600 text-white border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              🤖 Agent
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
            visibleAgents={combinedVisibleAgents}
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
            worldAgents={combinedWorldAgents}
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
            visibleAgents={combinedVisibleAgents}
            publishedTiles={publishedTiles}
            customTiles={customTiles}
            selectedImage={selectedImage}
            setSelectedImage={setSelectedImage}
            buildMode={buildMode}
            setBuildMode={setBuildMode}
            setCustomTiles={setCustomTiles}
            isPublishing={isPublishing}
            publishStatus={publishStatus}
            userId={userId}
            onPublishTiles={handlePublishTiles}
          />
          
          <AgentTab
            isActive={activeTab === 'agent'}
            onSpawnAgent={handleSpawnAgent}
            onRemoveAgentFromMap={handleRemoveAgentFromMap}
            spawnedAgents={Object.keys(spawnedA2AAgents)}
          />
        </div>
      </div>
    </div>
  );
}
