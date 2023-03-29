import express from 'express'
import { router as v1Router } from './routes/v1'

const app = express()
app.use(express.json())
app.use('/api/v1/stats', v1Router)

app.get('/ultmt-stats', (req, res) => {
    return res.json({ message: 'The statistics microservice of The Ultmt App' })
})

export default app
