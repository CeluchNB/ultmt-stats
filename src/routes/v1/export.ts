import { Request, Response, Router } from 'express'
import { exportGameStats } from '../../services/v1/export'

export const exportRouter = Router()

exportRouter.get('/export/game/:id', async (req: Request, res: Response, next) => {
    try {
        await exportGameStats('', req.params.id)
        res.send()
    } catch (error) {
        console.log('error', error)
        next(error)
    }
})
