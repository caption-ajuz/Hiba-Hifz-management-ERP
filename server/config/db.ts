import mongoose from 'mongoose';

export interface DbStatus {
  connected: boolean;
  state: 'connected' | 'connecting' | 'disconnected' | 'error';
  host?: string;
  databaseName?: string;
  lastConnectedAt?: Date;
  lastError?: string;
  errorCategory?: string;
  reconnectAttempts: number;
}

export const dbStatus: DbStatus = {
  connected: false,
  state: 'disconnected',
  reconnectAttempts: 0,
};

let isConnecting = false;

export async function connectDB(): Promise<boolean> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    dbStatus.state = 'error';
    dbStatus.lastError = 'MONGODB_URI environment variable is not defined';
    dbStatus.errorCategory = 'CONFIGURATION_ERROR';
    console.warn('[MongoDB Atlas] No MONGODB_URI found in environment.');
    return false;
  }

  if (isConnecting || mongoose.connection.readyState === 1) {
    return true;
  }

  try {
    isConnecting = true;
    dbStatus.state = 'connecting';
    console.log('[MongoDB Atlas] Connecting with connection pooling...');

    // Mongoose connection pooling options
    await mongoose.connect(uri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4 for stability across DNS providers
    });

    dbStatus.connected = true;
    dbStatus.state = 'connected';
    dbStatus.host = mongoose.connection.host;
    dbStatus.databaseName = mongoose.connection.name || 'hyba_hifz';
    dbStatus.lastConnectedAt = new Date();
    dbStatus.lastError = undefined;
    dbStatus.errorCategory = undefined;
    dbStatus.reconnectAttempts = 0;

    console.log(`[MongoDB Atlas] Connected successfully to host: ${mongoose.connection.host}, database: ${dbStatus.databaseName}`);
    return true;
  } catch (error: any) {
    dbStatus.connected = false;
    dbStatus.state = 'error';
    dbStatus.lastError = error.message || 'Failed to connect to MongoDB Atlas';
    dbStatus.errorCategory = error.name || 'CONNECTION_ERROR';
    dbStatus.reconnectAttempts += 1;
    console.error('[MongoDB Atlas] Connection error:', error.message);
    return false;
  } finally {
    isConnecting = false;
  }
}

mongoose.connection.on('disconnected', () => {
  dbStatus.connected = false;
  dbStatus.state = 'disconnected';
  console.warn('[MongoDB Atlas] Connection disconnected.');
});

mongoose.connection.on('reconnected', () => {
  dbStatus.connected = true;
  dbStatus.state = 'connected';
  dbStatus.lastConnectedAt = new Date();
  console.log('[MongoDB Atlas] Connection re-established.');
});

mongoose.connection.on('error', (err) => {
  dbStatus.connected = false;
  dbStatus.state = 'error';
  dbStatus.lastError = err.message;
  console.error('[MongoDB Atlas] Runtime connection error:', err.message);
});
