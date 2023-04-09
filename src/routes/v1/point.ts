import { Request, Response, Router } from 'express'
import { errorMiddleware } from '../../middleware/errors'
import { ingestPoint } from '../../services/v1/point'

export const pointRouter = Router()

pointRouter.post('/point', async (req: Request, res: Response, next) => {
    try {
        await ingestPoint(req.body.point)
        return res.status(201).send()
    } catch (e) {
        next(e)
    }
})

pointRouter.use(errorMiddleware)
