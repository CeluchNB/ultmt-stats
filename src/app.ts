import express, { ErrorRequestHandler, RequestHandler } from 'express'
import { createLazyRouter } from 'express-lazy-router'
import { errorMiddleware } from './middleware/errors'
import { Logger } from './logging'

const app = express()
app.use(express.json())

const logger = Logger()
app.use(logger.requestMiddleware as RequestHandler)

const lazyRouter = createLazyRouter()
app.use(
    '/api/v1/stats',
    lazyRouter(() => import('./routes/v1')),
)

app.get('/ultmt-stats', (req, res) => {
    return res.json({ message: 'The statistics microservice of The Ultmt App' })
})

app.use(logger.errorMiddleware as ErrorRequestHandler)
app.use(errorMiddleware)

export default app
