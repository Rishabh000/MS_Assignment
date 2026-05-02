import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { qualityCheckRouter } from './routes/qualityCheck'

dotenv.config()

const app = express()
const port = Number(process.env.SERVER_PORT ?? 8787)

app.use(cors())
app.use(express.json({ limit: '1mb' }))
app.use('/api', qualityCheckRouter)

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.listen(port, () => {
  console.log(`Quality check server running on http://localhost:${port}`)
})
