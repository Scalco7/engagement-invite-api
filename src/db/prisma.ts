import 'dotenv/config';
import { neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '../../generated/prisma/client';
import ws from 'ws';

declare global {
  // Prevent multiple instances of Prisma Client in development due to hot-reloading
  var prismaClientGlobal: PrismaClient | undefined;
}

// Configure the WebSocket constructor for the Neon driver in Node environment
neonConfig.webSocketConstructor = ws;

const connectionString = 
  process.env.DATABASE_URL || 
  process.env.POSTGRES_PRISMA_URL || 
  process.env.POSTGRES_URL || 
  '';

let prismaInstance: PrismaClient;

if (global.prismaClientGlobal) {
  prismaInstance = global.prismaClientGlobal;
} else {
  const adapter = new PrismaNeon({ connectionString });
  prismaInstance = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  if (process.env.NODE_ENV !== 'production') {
    global.prismaClientGlobal = prismaInstance;
  }
}

export const prisma = prismaInstance;
