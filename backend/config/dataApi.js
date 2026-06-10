// Lightweight MongoDB Atlas Data API client
import { URL } from 'url'

const BASE = process.env.DATA_API_URL
const API_KEY = process.env.DATA_API_KEY
const DATA_SOURCE = process.env.DATA_SOURCE || process.env.MONGODB_DATA_SOURCE || 'Cluster0'

function parseDbNameFromUri(uri) {
  if (!uri) return undefined
  try {
    const withoutQuery = uri.split('?')[0]
    const parts = withoutQuery.split('/')
    return parts[parts.length - 1] || undefined
  } catch (e) {
    return undefined
  }
}

const DATABASE = process.env.MONGODB_DB_NAME || parseDbNameFromUri(process.env.MONGODB_URI)

function ensureConfigured() {
  if (!BASE || !API_KEY) throw new Error('DATA_API_URL and DATA_API_KEY must be set for Data API client')
  if (!DATABASE) throw new Error('Database name not found. Set MONGODB_DB_NAME in .env')
}

async function request(action, body) {
  ensureConfigured()
  const url = new URL(`/action/${action}`, BASE).toString()
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': API_KEY
    },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    const err = new Error(`Data API ${action} failed: ${res.status} ${res.statusText} ${txt}`)
    err.status = res.status
    throw err
  }
  return res.json()
}

export async function find(collection, filter = {}, projection = {}) {
  return request('find', {
    dataSource: DATA_SOURCE,
    database: DATABASE,
    collection,
    filter,
    projection
  })
}

export async function findOne(collection, filter = {}, projection = {}) {
  return request('findOne', {
    dataSource: DATA_SOURCE,
    database: DATABASE,
    collection,
    filter,
    projection
  })
}

export async function insertOne(collection, document = {}) {
  return request('insertOne', {
    dataSource: DATA_SOURCE,
    database: DATABASE,
    collection,
    document
  })
}

export async function updateOne(collection, filter = {}, update = {}) {
  return request('updateOne', {
    dataSource: DATA_SOURCE,
    database: DATABASE,
    collection,
    filter,
    update
  })
}

export default { find, findOne, insertOne, updateOne }
