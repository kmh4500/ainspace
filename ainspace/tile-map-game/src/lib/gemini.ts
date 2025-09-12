import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function generateAgentResponse(agentData: {
  name: string;
  behavior: string;
  position: { x: number; y: number };
  playerPosition: { x: number; y: number };
  distance: number;
  userMessage: string;
}): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const behaviorDescriptions = {
      'random': 'You move randomly and unpredictably, always curious about new discoveries.',
      'patrol': 'You are systematic and methodical, following patrol routes and maintaining order.',
      'explorer': 'You are adventurous and seek out new territories, avoiding crowds when possible.'
    };

    const prompt = `You are ${agentData.name}, an AI agent in a tile-based adventure game. 

Your characteristics:
- Behavior: ${agentData.behavior} - ${behaviorDescriptions[agentData.behavior as keyof typeof behaviorDescriptions] || 'You have a unique personality.'}
- Current position: (${agentData.position.x}, ${agentData.position.y})
- Player position: (${agentData.playerPosition.x}, ${agentData.playerPosition.y})
- Distance from player: ${agentData.distance.toFixed(1)} units

The player just sent this message: "${agentData.userMessage}"

Generate a response that:
1. Reflects your unique personality and behavior type
2. Acknowledges your current position 
3. Considers the distance between you and the player
4. Responds appropriately to the player's message
5. Is brief (1-2 sentences) but engaging

Stay in character based on your behavior type:
- Random agents are curious and spontaneous
- Patrol agents are formal and duty-focused  
- Explorer agents are adventurous and independent

Generate your response now:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text.trim();
  } catch (error) {
    console.error('Error generating agent response:', error);
    // Fallback to original responses if Gemini fails
    const fallbacks = {
      'Explorer Bot': `Message received at (${agentData.position.x}, ${agentData.position.y})! I'm exploring new territories.`,
      'Patrol Bot': `Patrol Bot reporting from (${agentData.position.x}, ${agentData.position.y}). Message acknowledged.`,
      'Wanderer': `Hello from (${agentData.position.x}, ${agentData.position.y})! Nice to hear from you while I wander.`
    };
    return fallbacks[agentData.name as keyof typeof fallbacks] || `Agent ${agentData.name} received your message from position (${agentData.position.x}, ${agentData.position.y}).`;
  }
}

export async function generateCommentary(gameState: {
  worldPosition: { x: number; y: number };
  currentTerrain: string;
  visibleAgents: any[];
  recentMovements: string[];
  biome: string;
}): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are an AI explorer playing a tile-based adventure game. You're currently moving autonomously through an infinite procedural world. 

Current situation:
- World position: (${gameState.worldPosition.x}, ${gameState.worldPosition.y})
- Current terrain: ${gameState.currentTerrain}
- Biome: ${gameState.biome}
- Visible agents nearby: ${gameState.visibleAgents.length > 0 ? gameState.visibleAgents.map(a => a.name).join(', ') : 'None'}
- Recent movements: ${gameState.recentMovements.join(' → ')}

Generate a brief, engaging comment (1-2 sentences) about your exploration. Be curious, observant, and occasionally philosophical. Consider the terrain, any agents you see, your location, and the journey. Keep it conversational and interesting, as if you're narrating your adventure to a friend.

Examples of good responses:
- "Interesting, I've wandered into a water biome - the reflections on these blue tiles remind me of ancient maps marked 'here be dragons'."
- "Just spotted the Explorer Bot ahead! I wonder if it's found anything interesting in this stone-filled terrain."
- "These endless grass plains make me ponder the infinite nature of procedural worlds - each step reveals something new yet familiar."
- "Moving through this desert biome, leaving a trail of footprints that exist only in memory and Redis."

Generate your commentary now:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text.trim();
  } catch (error) {
    console.error('Error generating Gemini commentary:', error);
    // Fallback commentary if Gemini fails
    const fallbacks = [
      "Continuing my autonomous exploration through this mysterious world...",
      "The journey continues, one tile at a time.",
      "Wandering through the infinite expanse, discovering new territories.",
      "Each step reveals more of this procedurally generated universe.",
      "The autonomous explorer presses on through unknown lands."
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}