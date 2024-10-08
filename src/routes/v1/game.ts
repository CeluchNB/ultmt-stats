import { Request, Response, Router } from 'express'
import {
    createGame,
    deleteGame,
    filterGameStats,
    finishGame,
    getGameById,
    rebuildAtomicPlayers,
} from '../../services/v1/game'
import { body, param, query } from 'express-validator'

export const gameRouter = Router()

gameRouter.post('/game', body('game').isObject(), async (req: Request, res: Response, next) => {
    try {
        await createGame(req.body.game)
        return res.status(201).send()
    } catch (error) {
        next(error)
    }
})

gameRouter.put('/game/finish/:id', async (req: Request, res: Response, next) => {
    try {
        await finishGame(req.params.id, req.body.pointTotal as number)
        return res.send()
    } catch (error) {
        next(error)
    }
})

gameRouter.get('/game/:id', async (req: Request, res: Response, next) => {
    try {
        const game = await getGameById(req.params.id)
        return res.json({ game })
    } catch (error) {
        next(error)
    }
})

gameRouter.get(
    '/filter/game/:id',
    param('id').isString(),
    query('team').isString(),
    async (req: Request, res: Response, next) => {
        try {
            const game = await filterGameStats(req.params.id, req.query.team as string)
            return res.json({ game })
        } catch (error) {
            next(error)
        }
    },
)

gameRouter.put('/game/rebuild/:id', async (req: Request, res: Response, next) => {
    try {
        await rebuildAtomicPlayers(req.params.id)
        return res.send()
    } catch (error) {
        next(error)
    }
})

gameRouter.put('/game/delete/:id', query('team').isString(), async (req: Request, res: Response, next) => {
    try {
        await deleteGame(req.params.id, req.query.team as string)
        return res.send()
    } catch (error) {
        next(error)
    }
})
