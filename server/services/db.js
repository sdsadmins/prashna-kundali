/**
 * MongoDB connection utility for serverless environments
 * Caches the connection across warm invocations
 */
const { MongoClient } = require('mongodb');

let cachedClient = null;
let cachedDb = null;

async function getDb() {
  if (cachedDb) return cachedDb;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  if (!cachedClient) {
    cachedClient = new MongoClient(uri);
    await cachedClient.connect();
  }

  cachedDb = cachedClient.db('prashna-kundali');
  return cachedDb;
}

async function getCalculationsCollection() {
  const db = await getDb();
  return db.collection('calculations');
}

module.exports = { getDb, getCalculationsCollection };
