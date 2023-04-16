import { Request, Response, Router } from 'express'
import { errorMiddleware } from '../../middleware/errors'
import { deletePoint, ingestPoint } from '../../services/v1/point'

export const pointRouter = Router()

pointRouter.post('/point', async (req: Request, res: Response, next) => {
    try {
        console.log('got point', req.body.point.gameId)
        await ingestPoint(req.body.point)
        return res.status(201).send()
    } catch (e) {
        console.log('got error', e)
        next(e)
    }
})

pointRouter.delete('/point/:id', async (req: Request, res: Response, next) => {
    try {
        await deletePoint(req.body.gameId, req.params.id)
        return res.status(200).send()
    } catch (e) {
        next(e)
    }
})

pointRouter.use(errorMiddleware)
