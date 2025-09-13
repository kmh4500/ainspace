import React from 'react';
import BaseTabContent from './BaseTabContent';

interface AgentTabProps {
  isActive: boolean;
}

export default function AgentTab({ isActive }: AgentTabProps) {
  return (
    <BaseTabContent isActive={isActive}>
      <div className="flex flex-1 h-full w-full min-w-md items-center justify-center">
        <p className="text-gray-500">Agent management coming soon.</p>
      </div>
    </BaseTabContent>
  );
}