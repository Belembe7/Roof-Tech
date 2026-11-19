import './config/load-env.js'
import { app } from './app.js'
import { env } from './config/env.js'
import { prisma } from './db/client.js'

const server = app.listen(env.API_PORT, '0.0.0.0', () => {
  console.log(`Roof Tech API disponível na porta ${env.API_PORT}.`)
})

async function shutdown() {
  server.close(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
}

process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
