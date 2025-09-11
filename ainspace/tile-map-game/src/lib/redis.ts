import { createClient } from 'redis';

const client = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

client.on('error', (err) => {
  console.error('Redis Client Error', err);
});

let isConnected = false;

export async function getRedisClient() {
  if (!isConnected) {
    await client.connect();
    isConnected = true;
  }
  return client;
}

export interface PlayerPosition {
  x: number;
  y: number;
  lastUpdated: string;
}

export async function savePlayerPosition(userId: string, position: { x: number; y: number }): Promise<void> {
  try {
    const redis = await getRedisClient();
    const playerData: PlayerPosition = {
      x: position.x,
      y: position.y,
      lastUpdated: new Date().toISOString()
    };
    
    await redis.hSet(`player:${userId}`, playerData);
    await redis.expire(`player:${userId}`, 86400); // Expire after 24 hours
  } catch (error) {
    console.error('Error saving player position:', error);
    throw error;
  }
}

export async function getPlayerPosition(userId: string): Promise<PlayerPosition | null> {
  try {
    const redis = await getRedisClient();
    const playerData = await redis.hGetAll(`player:${userId}`);
    
    if (!playerData || Object.keys(playerData).length === 0) {
      return null;
    }
    
    return {
      x: parseInt(playerData.x) || 0,
      y: parseInt(playerData.y) || 0,
      lastUpdated: playerData.lastUpdated || new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting player position:', error);
    return null;
  }
}

export async function deletePlayerPosition(userId: string): Promise<void> {
  try {
    const redis = await getRedisClient();
    await redis.del(`player:${userId}`);
  } catch (error) {
    console.error('Error deleting player position:', error);
    throw error;
  }
}