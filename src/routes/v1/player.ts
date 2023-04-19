import { Request, Response, Router } from 'express'
import { errorMiddleware } from '../../middleware/errors'
import { getPlayerById } from '../../services/v1/player'

export const playerRouter = Router()

playerRouter.get('/player/:id', async (req: Request, res: Response, next) => {
    try {
        const player = await getPlayerById(req.params.id)
        return res.json({ player })
    } catch (error) {
        next(error)
    }
})

playerRouter.use(errorMiddleware)
