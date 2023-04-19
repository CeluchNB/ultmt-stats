import { gameRouter } from './game'
import { playerRouter } from './player'
import { pointRouter } from './point'
import { Router } from 'express'

export const router = Router()

router.use(gameRouter)
router.use(pointRouter)
router.use(playerRouter)
