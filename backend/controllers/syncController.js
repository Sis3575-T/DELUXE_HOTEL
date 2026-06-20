import mongoose from 'mongoose'
import Hotel from '../models/hotelModels.js'
import Reservation from '../models/reservationModels.js'
import Revenue from '../models/revenueModels.js'
import Review from '../models/reviewModels.js'
import Message from '../models/messageModels.js'
import Staff from '../models/staffModels.js'
import Role from '../models/roleModels.js'
import Housekeeping from '../models/housekeepingModels.js'
import Maintenance from '../models/maintenanceModels.js'
import Settings from '../models/settingsModels.js'
import About from '../models/aboutModels.js'
import Activity from '../models/activityModels.js'
import Newsletter from '../models/newsletterModels.js'
import Notification from '../models/notificationModels.js'
import Payment from '../models/paymentModels.js'
import { resolveConnectionUri } from '../config/mongodb.js'

const MODELS = [
  { name: 'hotels', model: Hotel },
  { name: 'reservations', model: Reservation },
  { name: 'revenues', model: Revenue },
  { name: 'reviews', model: Review },
  { name: 'messages', model: Message },
  { name: 'staff', model: Staff },
  { name: 'roles', model: Role },
  { name: 'housekeeping', model: Housekeeping },
  { name: 'maintenance', model: Maintenance },
  { name: 'settings', model: Settings },
  { name: 'about', model: About },
  { name: 'activities', model: Activity },
  { name: 'newsletters', model: Newsletter },
  { name: 'notifications', model: Notification },
  { name: 'payments', model: Payment },
]

function maskUri(uri) {
  return uri ? uri.replace(/(:\/\/)([^:]+):([^@]+)@/, '$1$2:****@') : 'not set'
}

async function withAtlasDb(fn) {
  const uri = process.env.ATLAS_MONGODB_URI
  if (!uri) throw new Error('ATLAS_MONGODB_URI not configured in backend/.env')
  let conn
  try {
    const resolvedUri = uri.startsWith('mongodb+srv://') ? await resolveConnectionUri(uri) : uri
    conn = await mongoose.createConnection(resolvedUri).asPromise()
    await fn(conn)
  } finally {
    if (conn) await conn.close()
  }
}

async function readAllData(modelList) {
  const data = {}
  for (const { name, model } of modelList) {
    const docs = await model.find().lean()
    if (docs.length) data[name] = docs
  }
  return data
}

async function writeAllData(conn, modelList, data) {
  for (const { name, model } of modelList) {
    if (!data[name]) continue
    const AtlasModel = conn.model(model.modelName, model.schema)
    await AtlasModel.deleteMany({})
    if (data[name].length) {
      await AtlasModel.insertMany(data[name])
    }
  }
}

const pushToAtlas = async (req, res) => {
  try {
    const data = await readAllData(MODELS)
    const counts = {}
    for (const [k, v] of Object.entries(data)) counts[k] = v.length

    await withAtlasDb(async (conn) => {
      await writeAllData(conn, MODELS, data)
    })

    res.json({
      success: true,
      message: 'Data pushed to Atlas successfully',
      collections: counts,
    })
  } catch (error) {
    console.error('pushToAtlas error:', error?.message || error)
    res.status(500).json({ success: false, message: error?.message || 'Error pushing to Atlas' })
  }
}

const pullFromAtlas = async (req, res) => {
  try {
    let atlasData = {}
    await withAtlasDb(async (conn) => {
      for (const { name, model } of MODELS) {
        const AtlasModel = conn.model(model.modelName, model.schema)
        const docs = await AtlasModel.find().lean()
        if (docs.length) atlasData[name] = docs
      }
    })

    const counts = {}
    for (const [k, v] of Object.entries(atlasData)) counts[k] = v.length

    await writeAllData(mongoose.connection, MODELS, atlasData)

    res.json({
      success: true,
      message: 'Data pulled from Atlas successfully',
      collections: counts,
    })
  } catch (error) {
    console.error('pullFromAtlas error:', error?.message || error)
    res.status(500).json({ success: false, message: error?.message || 'Error pulling from Atlas' })
  }
}

const syncStatus = async (req, res) => {
  try {
    const localUri = process.env.MONGODB_URI || 'not set'
    const atlasUri = process.env.ATLAS_MONGODB_URI || 'not set'

    const localCounts = {}
    for (const { name, model } of MODELS) {
      localCounts[name] = await model.countDocuments()
    }

    let atlasCounts = {}
    if (process.env.ATLAS_MONGODB_URI) {
      try {
        await withAtlasDb(async (conn) => {
          for (const { name, model } of MODELS) {
            const AtlasModel = conn.model(model.modelName, model.schema)
            atlasCounts[name] = await AtlasModel.countDocuments()
          }
        })
      } catch (e) {
        atlasCounts = { error: e.message }
      }
    }

    res.json({
      success: true,
      local: { uri: maskUri(localUri), counts: localCounts },
      atlas: { uri: maskUri(atlasUri), counts: atlasCounts },
      note: process.env.ATLAS_MONGODB_URI
        ? 'ATLAS_MONGODB_URI is configured'
        : 'ATLAS_MONGODB_URI not set — add it to backend/.env to enable sync',
    })
  } catch (error) {
    console.error('syncStatus error:', error?.message || error)
    res.status(500).json({ success: false, message: error?.message || 'Error checking sync status' })
  }
}

export { pushToAtlas, pullFromAtlas, syncStatus }
