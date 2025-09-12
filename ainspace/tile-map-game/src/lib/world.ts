export interface Agent {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  behavior: string;
}

export interface Player {
  x: number;
  y: number;
}

export interface Message {
  id: string;
  content: string;
  sender: 'player';
  timestamp: Date;
  mentions: string[]; // Agent names that are mentioned
}

export interface AgentResponse {
  agentId: string;
  agentName: string;
  message: string;
  delay: number; // in milliseconds
  position: { x: number; y: number };
  distance: number;
}

export class World {
  private agents: Agent[] = [];
  private player: Player = { x: 0, y: 0 };
  private readonly MAX_SPEED = 10; // units per second

  constructor(agents: Agent[], player: Player) {
    this.agents = agents;
    this.player = player;
  }

  updatePlayer(position: Player) {
    this.player = position;
  }

  updateAgents(agents: Agent[]) {
    this.agents = agents;
  }

  // Calculate Euclidean distance between two points
  private calculateDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
    return Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2));
  }

  // Calculate message travel delay based on distance
  private calculateDelay(distance: number, baseDelay: number = 500): number {
    const travelTime = (distance / this.MAX_SPEED) * 1000; // Convert to milliseconds
    return baseDelay + travelTime;
  }

  // Extract mentioned agent names from message content
  private extractMentions(content: string): string[] {
    const mentionRegex = /@(\w+(?:\s+\w+)*)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]);
    }

    return mentions;
  }

  // Find agents that are mentioned in the message
  private findMentionedAgents(mentions: string[]): Agent[] {
    return this.agents.filter(agent => 
      mentions.some(mention => 
        agent.name.toLowerCase().includes(mention.toLowerCase()) ||
        mention.toLowerCase().includes(agent.name.toLowerCase())
      )
    );
  }

  // Process incoming message and determine which agents should respond
  async processMessage(content: string): Promise<AgentResponse[]> {
    const mentions = this.extractMentions(content);
    
    // If no mentions, no one responds
    if (mentions.length === 0) {
      return [];
    }

    const mentionedAgents = this.findMentionedAgents(mentions);
    const responses: AgentResponse[] = [];

    for (let i = 0; i < mentionedAgents.length; i++) {
      const agent = mentionedAgents[i];
      const distance = this.calculateDistance(this.player, { x: agent.x, y: agent.y });
      
      // Add stagger delay to prevent simultaneous responses
      const staggerDelay = i * 100;
      const totalDelay = this.calculateDelay(distance, 500 + staggerDelay);

      // Generate agent response
      const agentResponse = await this.generateAgentResponse(agent, content, distance);

      responses.push({
        agentId: agent.id,
        agentName: agent.name,
        message: agentResponse,
        delay: totalDelay,
        position: { x: agent.x, y: agent.y },
        distance: distance
      });
    }

    return responses;
  }

  // Generate response for a specific agent
  private async generateAgentResponse(agent: Agent, userMessage: string, distance: number): Promise<string> {
    try {
      const response = await fetch('/api/agent-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentData: {
            name: agent.name,
            behavior: agent.behavior,
            position: { x: agent.x, y: agent.y },
            playerPosition: this.player,
            distance: distance,
            userMessage: userMessage
          }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.response;
      }
    } catch (error) {
      console.error(`Failed to generate response for ${agent.name}:`, error);
    }
    
    // Fallback response if API fails
    return `${agent.name} at (${agent.x}, ${agent.y}) received your message but couldn't respond properly.`;
  }

  // Get all agents within a certain radius (for autocomplete suggestions)
  getAgentsInRange(radius?: number): Agent[] {
    if (radius === undefined) {
      return this.agents;
    }

    return this.agents.filter(agent => {
      const distance = this.calculateDistance(this.player, { x: agent.x, y: agent.y });
      return distance <= radius;
    });
  }

  // Get agent suggestions for autocomplete based on partial name
  getAgentSuggestions(partialName: string): Agent[] {
    const searchTerm = partialName.toLowerCase();
    return this.agents.filter(agent => 
      agent.name.toLowerCase().includes(searchTerm)
    );
  }

  // Get current player position
  getPlayerPosition(): Player {
    return { ...this.player };
  }

  // Get all agents
  getAllAgents(): Agent[] {
    return [...this.agents];
  }
}