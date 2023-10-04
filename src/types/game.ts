import { Types } from 'mongoose'
import { IAtomicPlayer } from './atomic-stat'
import IPlayer, { CalculatedPlayerData, EmbeddedPlayer, PlayerData } from './player'
import { EmbeddedTeam, TeamData } from './team'
import { IConnection } from './connection'

export interface Leader {
    player?: EmbeddedPlayer | IAtomicPlayer | IPlayer
    total: number
}

export type IdentifiedPlayerData = PlayerData & { _id: Types.ObjectId }
export type IdentifiedTeamData = TeamData & { _id?: Types.ObjectId }
export interface IPoint {
    _id: Types.ObjectId
    players: IdentifiedPlayerData[]
    connections: IConnection[]
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

export interface MomentumPoint {
    x: number
    y: number
}
interface IGame {
    _id: Types.ObjectId
    startTime: Date
    teamOneId: Types.ObjectId
    teamTwoId?: Types.ObjectId
    winningTeam?: 'one' | 'two'
    points: IPoint[]
    momentumData: MomentumPoint[]
}

export interface GameInput {
    _id: string
    startTime: Date
    teamOne: EmbeddedTeam
    teamTwo: Partial<EmbeddedTeam>
    teamOnePlayers: EmbeddedPlayer[]
    teamTwoPlayers: EmbeddedPlayer[]
}

export type FilteredGamePlayer = CalculatedPlayerData & PlayerData & EmbeddedPlayer
export interface FilteredGameData extends GameData {
    _id: Types.ObjectId
    startTime: Date
    teamOneId: Types.ObjectId
    teamTwoId?: Types.ObjectId
    winningTeam?: 'one' | 'two'
    players: FilteredGamePlayer[]
}

export default IGame
