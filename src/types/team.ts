import { Types } from 'mongoose'

export interface EmbeddedTeam {
    _id: Types.ObjectId
    place: string
    name: string
    teamName: string
    seasonStart: Date
    seasonEnd: Date
}

interface ITeam extends EmbeddedTeam {
    wins: number
    losses: number
    goalsFor: number
    goalsAgainst: number
    holds: number
    breaks: number
    turnoverFreeHolds: number
    offensePoints: number
    defensePoints: number
    turnovers: number
    turnoversForced: number
    players: Types.ObjectId[]
    games: Types.ObjectId[]
    continuationId: Types.ObjectId
}

export default ITeam
