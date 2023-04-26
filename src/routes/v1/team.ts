import { Request, Response, Router } from 'express'
import { param } from 'express-validator'
import { errorMiddleware } from '../../middleware/errors'
import { filterTeamStats, getTeamById } from '../../services/v1/team'

export const teamRouter = Router()

teamRouter.get('/team/:id', param('id').isString(), async (req: Request, res: Response, next) => {
    try {
        const team = await getTeamById(req.params.id)
        return res.json({ team })
    } catch (error) {
        next(error)
    }
})

teamRouter.get('/filter/team/:id', async (req: Request, res: Response, next) => {
    try {
        const gameIds: string[] = []
        if (req.query.games) {
            gameIds.push(...(req.query.games as string).split(','))
        }
        const team = await filterTeamStats(req.params.id, gameIds)
        return res.json({ team })
    } catch (error) {
        next(error)
    }
})

teamRouter.use(errorMiddleware)
