import { Request, Response, Router } from 'express'
import { createGame, finishGame } from '../../services/v1/game'
import { body } from 'express-validator'
import { errorMiddleware } from '../../middleware/errors'

export const gameRouter = Router()

gameRouter.post('/game', body('game').isObject(), async (req: Request, res: Response, next) => {
    try {
        await createGame(req.body.game)
        return res.status(201).send()
    } catch (error) {
        next(error)
    }
})

gameRouter.post('/game/finish/:id', async (req: Request, res: Response, next) => {
    try {
        await finishGame(req.body.id)
        return res.send()
    } catch (error) {
        next(error)
    }
})
gameRouter.use(errorMiddleware)
