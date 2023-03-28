import { Types } from 'mongoose'
import { EmbeddedPlayer } from './player'
import { EmbeddedTeam } from './team'

interface Leader {
    player: EmbeddedPlayer
    total: number
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