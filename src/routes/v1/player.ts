import { Request, Response, Router } from 'express'
import { param } from 'express-validator'
import { getPlayerById, filterPlayerStats } from '../../services/v1/player'

export const playerRouter = Router()

playerRouter.get('/player/:id', param('id').isString(), async (req: Request, res: Response, next) => {
    try {
        const player = await getPlayerById(req.params.id)
        return res.json({ player })
    } catch (error) {
        next(error)
    }
})

playerRouter.get('/filter/player/:id', param('id').isString(), async (req: Request, res: Response, next) => {
    try {
        const teamIds: string[] = []
        const gameIds: string[] = []
        if (req.query.teams) {
            teamIds.push(...(req.query.teams as string).split(','))
        }
        if (req.query.games) {
            gameIds.push(...(req.query.games as string).split(','))
        }
        const stats = await filterPlayerStats(req.params.id, gameIds, teamIds)
        return res.json({ stats })
    } catch (error) {
        next(error)
    }
})
