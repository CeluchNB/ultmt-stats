import { Types } from 'mongoose'

export interface EmbeddedPlayer {
    _id: Types.ObjectId
    firstName: string
    lastName: string
    username: string
}

interface IPlayer extends EmbeddedPlayer {
    goals: number
    assists: number
    blocks: number
    throwaways: number
    drops: number
    stalls: number
    touches: number
    catches: number
    completedPasses: number
    attemptedPasses: number
    callahans: number
    pointsPlayed: number
    wins: number
    losses: number
    games: Types.ObjectId[]
    teams: Types.ObjectId[]
}

export default IPlayer