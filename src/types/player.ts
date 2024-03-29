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
    hockeyAssists: number
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
    defensePoints: number
    offensePoints: number
    holds: number
    breaks: number
    wins: number
    losses: number
}

export type PlayerDataKey = keyof PlayerData
export type PlayerDataId = PlayerData & { playerId: Types.ObjectId }

export interface CalculatedPlayerData {
    plusMinus: number
    catchingPercentage: number
    throwingPercentage: number
    ppGoals: number
    ppAssists: number
    ppHockeyAssists: number
    ppThrowaways: number
    ppDrops: number
    ppBlocks: number
    winPercentage: number
    offensiveEfficiency: number
    defensiveEfficiency: number
}
interface IPlayer extends EmbeddedPlayer, PlayerData, CalculatedPlayerData {
    games: Types.ObjectId[]
    teams: Types.ObjectId[]
}

export default IPlayer
