import { Request, Response, Router } from 'express'
import { query } from 'express-validator'
import { errorMiddleware } from '../../middleware/errors'
import { getConnection, getConnectionByGame } from '../../services/v1/connection'

export const connectionRouter = Router()

connectionRouter.get(
    '/connection',
    query('thrower').isString(),
    query('receiver').isString(),
    async (req: Request, res: Response, next) => {
        try {
            const throwerId = req.query.thrower as string
            const receiverId = req.query.receiver as string
            const connection = await getConnection(throwerId, receiverId)
            return res.json({ connection })
        } catch (error) {
            next(error)
        }
    },
)

connectionRouter.get(
    '/connection/game',
    query('thrower').isString(),
    query('receiver').isString(),
    query('game').isString(),
    async (req: Request, res: Response, next) => {
        try {
            const throwerId = req.query.thrower as string
            const receiverId = req.query.receiver as string
            const gameId = req.query.game as string
            const connection = await getConnectionByGame(throwerId, receiverId, gameId)
            return res.json({ connection })
        } catch (error) {
            next(error)
        }
    },
)

connectionRouter.use(errorMiddleware)
