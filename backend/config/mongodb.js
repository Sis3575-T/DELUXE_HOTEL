import mongoose from 'mongoose'
import * as dataApi from './dataApi.js'
import { Resolver } from 'dns/promises'

const PUBLIC_DNS = ['1.1.1.1', '8.8.8.8']

function maskUri(uri) {
    return uri ? uri.replace(/(:\/\/)([^:]+):([^@]+)@/, '$1$2:****@') : 'MONGODB_URI not set'
}

async function resolveSrvWithPublicDns(hostname) {
    const srvName = `_mongodb._tcp.${hostname}`
    for (const server of PUBLIC_DNS) {
        try {
            const resolver = new Resolver()
            resolver.setServers([server])
            return await resolver.resolveSrv(srvName)
        } catch {
            // try next resolver
        }
    }
    throw new Error(`SRV resolution failed for ${srvName}`)
}

async function resolveConnectionUri(uri) {
    if (!uri?.startsWith('mongodb+srv://')) return uri

    const afterAt = uri.includes('@') ? uri.split('@')[1] : uri.replace('mongodb+srv://', '')
    const hostname = afterAt.split('/')[0].split('?')[0].split(',')[0]

    let srvRecords
    try {
        srvRecords = await resolveSrvWithPublicDns(hostname)
    } catch (err) {
        console.warn(
            `SRV resolution via public DNS failed for ${hostname}: ${err?.message || err}. Falling back to original URI.`
        )
        return uri
    }

    const hosts = srvRecords.map((s) => `${s.name}:${s.port}`).join(',')

    const dbName =
        process.env.MONGODB_DB_NAME ||
        uri.split('/').slice(3).join('/').split('?')[0] ||
        ''
    const authPart = uri.includes('@') ? uri.split('://')[1].split('@')[0] : null
    const authSegment = authPart ? `${authPart}@` : ''

    const params = new URLSearchParams(uri.includes('?') ? uri.split('?')[1] : '')
    params.set('tls', 'true')
    params.set('authSource', 'admin')

    return `mongodb://${authSegment}${hosts}/${dbName}?${params}`
}

export { resolveConnectionUri }

const connectDB = async () => {
    const uri = process.env.MONGODB_URI
    if (!uri) {
        console.error('MONGODB_URI not set')
        return
    }

    try {
        let connectUri = uri
        if (uri.startsWith('mongodb+srv://')) {
            connectUri = await resolveConnectionUri(uri)
        }
        console.log(`Connecting to MongoDB: ${maskUri(connectUri)}`)
        await mongoose.connect(connectUri)
        console.log('MongoDB connected')
        globalThis.dbClient = { type: 'mongoose', client: mongoose }
    } catch (err) {
        console.error('MongoDB connection error:', err.message)
        if (err?.message?.includes('SRV resolution failed')) {
            console.error(`SRV resolution failed for host in MONGODB_URI. Check your MONGODB_URI in backend/.env. Masked URI: ${maskUri(uri)}`)
        }

        if (process.env.DATA_API_URL && process.env.DATA_API_KEY) {
            globalThis.dbClient = { type: 'dataApi', client: dataApi }
            console.log('Using Atlas Data API fallback')
        } else {
            console.error('Continuing without database connection')
        }
    }
}

export default connectDB
