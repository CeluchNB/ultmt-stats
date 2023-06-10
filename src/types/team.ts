import { Types } from 'mongoose'
import { FilteredGamePlayer, GameData } from './game'

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
    winPercentage: number
    offensiveConversion: number
    defensiveConversion: number
}

export interface FilteredTeamData extends EmbeddedTeam, GameData {
    players: FilteredGamePlayer[]
    games: Types.ObjectId[]
    winPercentage: number
    offensiveConversion: number
    defensiveConversion: number
}

export default ITeam
