// Removed direct gemini import to ensure server-side only calls

export interface AgentState {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  behavior: string;
  direction?: 'up' | 'down' | 'left' | 'right';
  lastMoved?: number;
  moveInterval?: number;
}

export interface Message {
  id: string;
  content: string;
  sender: 'player';
  timestamp: Date;
  playerPosition: { x: number; y: number };
  distance: number;
  isMentioned: boolean;
  threadId?: string;
}

export interface AgentResponse {
  agentId: string;
  message: string;
  timestamp: Date;
  delay: number;
}

export abstract class BaseAgent {
  protected state: AgentState;
  protected activeThreads: Set<string> = new Set();

  constructor(initialState: AgentState) {
    this.state = { ...initialState };
  }

  // Getters
  get id(): string { return this.state.id; }
  get name(): string { return this.state.name; }
  get color(): string { return this.state.color; }
  get x(): number { return this.state.x; }
  get y(): number { return this.state.y; }
  get behavior(): string { return this.state.behavior; }
  get position(): { x: number; y: number } { return { x: this.state.x, y: this.state.y }; }

  // Update agent state
  updateState(newState: Partial<AgentState>): void {
    this.state = { ...this.state, ...newState };
  }


  // Abstract method for agent-specific message processing
  protected abstract shouldRespondToMessage(): boolean;

  // Add agent to a thread
  joinThread(threadId: string): void {
    this.activeThreads.add(threadId);
  }

  // Remove agent from a thread
  leaveThread(threadId: string): void {
    this.activeThreads.delete(threadId);
  }

  // Check if agent is in a thread
  isInThread(threadId: string): boolean {
    return this.activeThreads.has(threadId);
  }

  // Process incoming message and generate response if appropriate
  async processMessage(message: Message, totalDelay: number): Promise<AgentResponse | null> {
    console.log(`Agent ${this.name} processing message:`, {
      threadId: message.threadId,
      isMentioned: message.isMentioned,
      isInThread: message.threadId ? this.isInThread(message.threadId) : 'N/A',
      activeThreads: Array.from(this.activeThreads)
    });

    // Check thread participation
    if (message.threadId) {
      // If this is a threaded message, only respond if we're in the thread OR being mentioned
      if (!this.isInThread(message.threadId) && !message.isMentioned) {
        console.log(`Agent ${this.name} not responding: not in thread ${message.threadId} and not mentioned`);
        return null;
      }
      // If mentioned in a thread we're not in, join the thread
      if (message.isMentioned && !this.isInThread(message.threadId)) {
        console.log(`Agent ${this.name} joining thread ${message.threadId} due to mention`);
        this.joinThread(message.threadId);
      }
    } else {
      // For non-threaded messages, check if this agent should respond
      if (!message.isMentioned && !this.shouldRespondToMessage()) {
        return null;
      }
    }

    try {
      // Generate response using server-side API
      const response = await fetch('/api/agent-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentData: {
            name: this.state.name,
            behavior: this.state.behavior,
            position: { x: this.state.x, y: this.state.y },
            playerPosition: message.playerPosition,
            distance: message.distance,
            userMessage: message.content,
            isMentioned: message.isMentioned
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const responseText = data.response;

      return {
        agentId: this.state.id,
        message: responseText,
        timestamp: new Date(),
        delay: totalDelay
      };

    } catch (error) {
      console.error(`Error processing message for ${this.state.name}:`, error);
      
      // Fallback response
      return {
        agentId: this.state.id,
        message: `${this.state.name} at (${this.state.x}, ${this.state.y}) received your message but couldn't respond properly.`,
        timestamp: new Date(),
        delay: totalDelay
      };
    }
  }

  // Get agent state for world system
  getState(): AgentState {
    return { ...this.state };
  }
}

export class ExplorerAgent extends BaseAgent {
  constructor(initialState: AgentState) {
    super(initialState);
  }

  protected shouldRespondToMessage(): boolean {
    // All agents are responsive - always respond to non-mentioned messages
    return true;
  }
}

export class PatrolAgent extends BaseAgent {
  constructor(initialState: AgentState) {
    super(initialState);
  }

  protected shouldRespondToMessage(): boolean {
    // All agents are responsive - always respond to non-mentioned messages
    return true;
  }
}

export class WandererAgent extends BaseAgent {
  constructor(initialState: AgentState) {
    super(initialState);
  }

  protected shouldRespondToMessage(): boolean {
    // All agents are responsive - always respond to non-mentioned messages
    return true;
  }
}

// Agent factory function
export function createAgent(type: string, initialState: AgentState): BaseAgent {
  switch (type) {
    case 'random':
      return new ExplorerAgent(initialState);
    case 'patrol':
      return new PatrolAgent(initialState);
    case 'explorer':
      return new WandererAgent(initialState);
    default:
      throw new Error(`Unknown agent type: ${type}`);
  }
}