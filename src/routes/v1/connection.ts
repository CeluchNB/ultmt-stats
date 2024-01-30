import { Request, Response, Router } from 'express'
import { query } from 'express-validator'
import { getConnection, filterConnectionStats } from '../../services/v1/connection'

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
    '/filter/connection',
    query('thrower').isString(),
    query('receiver').isString(),
    query('games').isString(),
    query('teams').isString(),
    async (req: Request, res: Response, next) => {
        try {
            const throwerId = req.query.thrower as string
            const receiverId = req.query.receiver as string

            const teamIds: string[] = []
            const gameIds: string[] = []
            if (req.query.teams) {
                teamIds.push(...(req.query.teams as string).split(','))
            }
            if (req.query.games) {
                gameIds.push(...(req.query.games as string).split(','))
            }
            const connections = await filterConnectionStats(throwerId, receiverId, gameIds, teamIds)
            return res.json({ connections })
        } catch (error) {
            next(error)
        }
    },
)
