import { Request, Response, Router } from 'express'
import { reconcileGuest } from '../../services/v1/reconcile-guest'

export const guestRouter = Router()

guestRouter.put('/reconcile-guest', async (req: Request, res: Response, next) => {
    try {
        const teamIds = req.body.teams
        const guestId = req.body.guestId
        const realUser = req.body.user
        await reconcileGuest(teamIds, guestId, realUser)
        return res.send()
    } catch (e) {
        next(e)
    }
})
