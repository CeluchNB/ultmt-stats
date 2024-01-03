import express from 'express'
import { createLazyRouter } from 'express-lazy-router'

const app = express()
app.use(express.json())

const lazyRouter = createLazyRouter()
app.use(
    '/api/v1/stats',
    lazyRouter(() => import('./routes/v1')),
)

app.get('/ultmt-stats', (req, res) => {
    return res.json({ message: 'The statistics microservice of The Ultmt App' })
})

export default app
