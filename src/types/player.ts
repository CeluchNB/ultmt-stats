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
    droppedPasses: number
    callahans: number
    pointsPlayed: number
    pulls: number
    wins: number
    losses: number
}

export type PlayerDataIndex = keyof PlayerData

interface IPlayer extends EmbeddedPlayer, PlayerData {
    games: Types.ObjectId[]
    teams: Types.ObjectId[]
}

export default IPlayer
