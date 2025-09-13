import React from 'react';
import ChatBox, { ChatBoxRef } from '@/components/ChatBox';
import BaseTabContent from './BaseTabContent';

interface ThreadTabProps {
  isActive: boolean;
  chatBoxRef: React.RefObject<ChatBoxRef>;
  lastCommentary: string;
  worldAgents: any[];
  worldPosition: { x: number; y: number };
  currentThreadId?: string;
  threads: {
    id: string;
    message: string;
    timestamp: Date;
    agentsReached: number;
    agentNames: string[];
  }[];
  onThreadSelect: (threadId: string | null) => void;
}

export default function ThreadTab({
  isActive,
  chatBoxRef,
  lastCommentary,
  worldAgents,
  worldPosition,
  currentThreadId,
  threads,
  onThreadSelect
}: ThreadTabProps) {
  return (
    <BaseTabContent isActive={isActive} withPadding={false}>
      <ChatBox 
        ref={chatBoxRef}
        className="h-full" 
        aiCommentary={lastCommentary}
        agents={worldAgents}
        playerWorldPosition={worldPosition}
        currentThreadId={currentThreadId}
        threads={threads}
        onThreadSelect={onThreadSelect}
      />
    </BaseTabContent>
  );
}