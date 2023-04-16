import { Types } from 'mongoose'

export interface EmbeddedTeam {
    _id?: Types.ObjectId
    place: string
    name: string
    teamname?: string
    seasonStart?: Date
    seasonEnd?: Date
}

export interface TeamData {
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
}

interface ITeam extends EmbeddedTeam, TeamData {
    players: Types.ObjectId[]
    games: Types.ObjectId[]
}

export default ITeam
