import { Request, Response, Router } from 'express'
import { exportGameStats } from '../../services/v1/export'
import { query } from 'express-validator'

export const exportRouter = Router()

exportRouter.get('/export/game/:id', query('user').escape(), async (req: Request, res: Response, next) => {
    try {
        console.log('in route')
        await exportGameStats(req.query.user as string, req.params.id)
        res.send()
    } catch (error) {
        next(error)
    }
})
