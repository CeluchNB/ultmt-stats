import { Types } from 'mongoose'

export interface EmbeddedPlayer {
    _id: Types.ObjectId
    firstName: string
    lastName: string
    username: string
}

export interface PlayerData {
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
}

interface IPlayer extends EmbeddedPlayer, PlayerData {
    games: Types.ObjectId[]
    teams: Types.ObjectId[]
}

export default IPlayer