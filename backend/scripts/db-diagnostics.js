import { resolveSrv, lookup, Resolver } from 'dns/promises'
import net from 'net'
import mongoose from 'mongoose'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '..', '.env') })

function maskUri(uri) {
  if (!uri) return 'MONGODB_URI not set'
  return uri.replace(/(:\/\/)([^:]+):([^@]+)@/, '$1$2:****@')
}

function testTcp(host, port = 27017, timeout = 4000) {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let done = false
    socket.setTimeout(timeout)
    socket.once('connect', () => {
      done = true
      socket.destroy()
      resolve({ host, port, ok: true })
    })
    socket.once('timeout', () => {
      if (done) return
      done = true
      socket.destroy()
      resolve({ host, port, ok: false, reason: 'timeout' })
    })
    socket.once('error', (err) => {
      if (done) return
      done = true
      resolve({ host, port, ok: false, reason: err.message })
    })
    socket.connect(port, host)
  })
}

async function resolveHostsFromUri(uri) {
  if (!uri) return []
  // strip options
  const afterAt = uri.includes('@') ? uri.split('@')[1] : uri
  const hostPart = afterAt.split('/')[0].split('?')[0]
  // for mongodb:// there may be multiple hosts comma-separated
  return hostPart.split(',').map(h => h.trim())
}

async function main() {
  const uri = process.env.MONGODB_URI
  console.log('Using MONGODB_URI:', maskUri(uri))

  const hosts = await resolveHostsFromUri(uri)
  if (hosts.length === 0) {
    console.log('No hosts parsed from MONGODB_URI')
    process.exit(1)
  }

  const firstHost = hosts[0]
  console.log('Parsed host(s):', hosts.join(', '))

  // If SRV style, try resolveSrv
  if (uri && uri.startsWith('mongodb+srv://')) {
    const srvName = `_mongodb._tcp.${firstHost}`
    try {
      console.log(`Resolving SRV records for ${srvName} ...`)
      const srv = await resolveSrv(srvName)
      console.log('SRV records:')
      srv.forEach(r => console.log(`  ${r.name} -> ${r.port} (priority ${r.priority} weight ${r.weight})`))

      for (const r of srv) {
        const res = await testTcp(r.name, r.port)
        console.log(`TCP ${r.name}:${r.port} -> ${res.ok ? 'SUCCESS' : 'FAIL'}${res.reason ? ' ('+res.reason+')' : ''}`)
      }
    } catch (err) {
      console.log('SRV resolution error:', err.message)
    }
  }

  // Try alternative DNS resolvers (Cloudflare / Google) for SRV if system DNS fails
  if (uri && uri.startsWith('mongodb+srv://')) {
    const srvName = `_mongodb._tcp.${firstHost}`
    const altServers = ['1.1.1.1', '8.8.8.8']
    for (const server of altServers) {
      try {
        const resolver = new Resolver()
        resolver.setServers([server])
        console.log(`Resolving SRV via ${server} for ${srvName} ...`)
        const srv = await resolver.resolveSrv(srvName)
        console.log(`SRV records from ${server}:`)
        srv.forEach(r => console.log(`  ${r.name} -> ${r.port} (priority ${r.priority} weight ${r.weight})`))
        for (const r of srv) {
          const res = await testTcp(r.name, r.port)
          console.log(`TCP ${r.name}:${r.port} -> ${res.ok ? 'SUCCESS' : 'FAIL'}${res.reason ? ' ('+res.reason+')' : ''}`)
        }
        // if we succeeded with an alternative resolver, stop trying others
        break
      } catch (e) {
        console.log(`Resolver ${server} SRV error:`, e.message)
      }
    }
  }

  // Also try DNS lookup for A records for each host parsed
  for (const host of hosts) {
    try {
      console.log(`Resolving A records for ${host} ...`)
      const addrs = await lookup(host, { all: true })
      addrs.forEach(a => console.log(`  ${host} -> ${a.address}`))
      for (const a of addrs) {
        const res = await testTcp(a.address, 27017)
        console.log(`TCP ${a.address}:27017 -> ${res.ok ? 'SUCCESS' : 'FAIL'}${res.reason ? ' ('+res.reason+')' : ''}`)
      }
    } catch (err) {
      console.log(`DNS lookup error for ${host}:`, err.message)
    }
  }

  // Try a quick mongoose connection with short timeout
  try {
    console.log('Attempting mongoose.connect (serverSelectionTimeoutMS=5000) ...')
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
    console.log('Mongoose connected successfully')
    await mongoose.disconnect()
  } catch (err) {
    console.log('Mongoose connect error:', err.message)
    if (err.stack) console.log(err.stack)
  }
}

main().catch(err => {
  console.error('Unexpected error in diagnostics:', err)
  process.exit(2)
})
