// server/queues/client.js — BullMQ Redis Client
const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');

let connection = null;

function getRedisConnection() {
  if (!connection) {
    if (!process.env.REDIS_URL) {
      console.warn('[Queue] REDIS_URL not set — automation queue disabled');
      return null;
    }
    connection = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    connection.on('error', (err) => console.error('[Redis] Connection error:', err.message));
    connection.on('connect', () => console.log('[Redis] Connected ✅'));
  }
  return connection;
}

function createQueue(name) {
  const conn = getRedisConnection();
  if (!conn) return null;
  return new Queue(name, { connection: conn });
}

function createWorker(name, processor) {
  const conn = getRedisConnection();
  if (!conn) return null;
  return new Worker(name, processor, { connection: conn });
}

module.exports = { getRedisConnection, createQueue, createWorker };
