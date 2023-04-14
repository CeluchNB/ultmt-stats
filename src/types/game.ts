import { Types } from 'mongoose'
import { EmbeddedPlayer, PlayerData } from './player'
import { EmbeddedTeam, TeamData } from './team'

interface Leader {
    player?: EmbeddedPlayer
    total: number
}

export type IdentifiedPlayerData = PlayerData & { _id: Types.ObjectId }
export type IdentifiedTeamData = TeamData & { _id?: Types.ObjectId }
export interface IPoint {
    _id: Types.ObjectId
    players: IdentifiedPlayerData[]
    teamOne: IdentifiedTeamData
    teamTwo: IdentifiedTeamData
}

export interface GameData {
    goalsLeader: Leader
    assistsLeader: Leader
    blocksLeader: Leader
    turnoversLeader: Leader
    plusMinusLeader: Leader
    pointsPlayedLeader: Leader
}

interface IGame extends GameData {
    _id: Types.ObjectId
    startTime: Date
    teamOneId: Types.ObjectId
    teamTwoId?: Types.ObjectId
    winningTeam?: 'one' | 'two'
    points: IPoint[]
}

export interface GameInput {
    _id: string
    startTime: Date
    teamOne: EmbeddedTeam
    teamTwo: Partial<EmbeddedTeam>
    teamOnePlayers: EmbeddedPlayer[]
    teamTwoPlayers: EmbeddedPlayer[]
}

export default IGame
