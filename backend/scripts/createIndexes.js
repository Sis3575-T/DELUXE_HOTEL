import mongoose from 'mongoose'
import 'dotenv/config'
import connectDB from '../config/mongodb.js'

async function createIndexes() {
  console.log('Connecting to MongoDB...')
  await connectDB()
  await new Promise(resolve => {
    if (mongoose.connection.readyState === 1) return resolve()
    mongoose.connection.once('connected', resolve)
  })

  const db = mongoose.connection.db

  if (!db) {
    console.log('No database connection')
    process.exit(1)
  }

  const collections = await db.listCollections().toArray()
  const collectionNames = collections.map(c => c.name)

  // Hotel collection indexes
  if (collectionNames.includes('hotels')) {
    await db.collection('hotels').createIndexes([
      { key: { status: 1 }, background: true },
      { key: { name: 1 }, background: true },
      { key: { roomType: 1 }, background: true },
      { key: { price: 1 }, background: true },
    ])
    console.log('Hotels indexes created')
  }

  // Reservations collection indexes
  if (collectionNames.includes('reservations')) {
    await db.collection('reservations').createIndexes([
      { key: { email: 1 }, background: true },
      { key: { roomId: 1 }, background: true },
      { key: { status: 1 }, background: true },
      { key: { checkin: 1 }, background: true },
      { key: { checkout: 1 }, background: true },
      { key: { checkin: 1, checkout: 1 }, background: true },
      { key: { status: 1, checkin: 1, checkout: 1 }, background: true },
    ])
    console.log('Reservations indexes created')
  }

  // Revenue collection indexes
  if (collectionNames.includes('revenues')) {
    await db.collection('revenues').createIndexes([
      { key: { date: -1 }, background: true },
      { key: { paymentMethod: 1 }, background: true },
      { key: { status: 1 }, background: true },
      { key: { customerName: 1 }, background: true },
    ])
    console.log('Revenues indexes created')
  }

  // Settings collection indexes
  if (collectionNames.includes('settings')) {
    await db.collection('settings').createIndexes([
      { key: { hotelName: 1 }, background: true },
    ])
    console.log('Settings index created')
  }

  // Notifications collection indexes
  if (collectionNames.includes('notifications')) {
    await db.collection('notifications').createIndexes([
      { key: { userId: 1 }, background: true },
      { key: { read: 1 }, background: true },
      { key: { createdAt: -1 }, background: true },
    ])
    console.log('Notifications indexes created')
  }

  // Staff collection indexes
  if (collectionNames.includes('staffs')) {
    await db.collection('staffs').createIndexes([
      { key: { email: 1 }, background: true },
      { key: { role: 1 }, background: true },
      { key: { department: 1 }, background: true },
    ])
    console.log('Staff indexes created')
  }

  // Payments collection indexes
  if (collectionNames.includes('payments')) {
    await db.collection('payments').createIndexes([
      // transactionId index is defined on the schema (unique) — avoid duplicating here
      { key: { bookingId: 1 }, background: true },
      { key: { guestEmail: 1 }, background: true },
      { key: { status: 1 }, background: true },
      { key: { paymentMethod: 1 }, background: true },
      { key: { createdAt: -1 }, background: true },
    ])
    console.log('Payments indexes created')
  }

  // Activity logs collection indexes
  if (collectionNames.includes('activities')) {
    await db.collection('activities').createIndexes([
      { key: { userId: 1 }, background: true },
      { key: { createdAt: -1 }, background: true },
      { key: { action: 1 }, background: true },
    ])
    console.log('Activity indexes created')
  }

  // Reviews collection indexes
  if (collectionNames.includes('reviews')) {
    await db.collection('reviews').createIndexes([
      { key: { guestName: 1 }, background: true },
      { key: { createdAt: -1 }, background: true },
    ])
    console.log('Reviews indexes created')
  }

  // Messages collection indexes
  if (collectionNames.includes('messages')) {
    await db.collection('messages').createIndexes([
      { key: { email: 1 }, background: true },
      { key: { read: 1 }, background: true },
      { key: { createdAt: -1 }, background: true },
    ])
    console.log('Messages indexes created')
  }

  // Housekeeping collection indexes
  if (collectionNames.includes('housekeepings')) {
    await db.collection('housekeepings').createIndexes([
      { key: { roomId: 1 }, background: true },
      { key: { status: 1 }, background: true },
      { key: { assignedTo: 1 }, background: true },
    ])
    console.log('Housekeeping indexes created')
  }

  // Maintenance collection indexes
  if (collectionNames.includes('maintenances')) {
    await db.collection('maintenances').createIndexes([
      { key: { roomId: 1 }, background: true },
      { key: { status: 1 }, background: true },
      { key: { priority: 1 }, background: true },
    ])
    console.log('Maintenance indexes created')
  }

  console.log('All indexes created successfully')
  process.exit(0)
}

createIndexes().catch(err => {
  console.error('Index creation failed:', err)
  process.exit(1)
})
