import { Types } from 'mongoose'

interface ITeam {
    place: string
    name: string
    teamName: string
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
    seasonStart: Date
    seasonEnd: Date
    players: Types.ObjectId[]
    games: Types.ObjectId[]
    continuationId: Types.ObjectId
}

export default ITeam
