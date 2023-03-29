import { Types } from 'mongoose'
import { EmbeddedPlayer, PlayerData } from './player'
import { EmbeddedTeam, TeamData } from './team'

interface Leader {
    player: EmbeddedPlayer
    total: number
}

type IdentifiedPlayerData = PlayerData & { _id: Types.ObjectId }
type IdentifiedTeamData = TeamData & { _id: Types.ObjectId }
export interface IPoint {
    _id: Types.ObjectId
    players: IdentifiedPlayerData[]
    teamOne: IdentifiedTeamData
    teamTwo: IdentifiedTeamData
}

interface IGame {
    _id: Types.ObjectId
    startTime: Date
    goalsLeader: Leader
    assistsLeader: Leader
    blocksLeader: Leader
    turnoverLeader: Leader
    plusMinusLeader: Leader
    pointsPlayedLeader: Leader
    teamOneId: Types.ObjectId
    teamTwoId: Types.ObjectId
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