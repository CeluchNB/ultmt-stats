import { connectionRouter } from './connection'
import { gameRouter } from './game'
import { playerRouter } from './player'
import { pointRouter } from './point'
import { teamRouter } from './team'
import { guestRouter } from './reconcile-guest'
import { Router } from 'express'

const router = Router()

router.use(gameRouter)
router.use(pointRouter)
router.use(playerRouter)
router.use(teamRouter)
router.use(connectionRouter)
router.use(guestRouter)

export default router
