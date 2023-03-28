import { Types } from 'mongoose'
import { EmbeddedPlayer } from './player'

interface Leader {
    player: EmbeddedPlayer
    total: number
}

interface IGame {
    _id: Types.ObjectId
    goalsLeader: Leader
    assistsLeader: Leader
    blocksLeader: Leader
    turnoverLeader: Leader
    plusMinusLeader: Leader
    pointsPlayedLeader: Leader
    teamOneId: Types.ObjectId
    teamTwoId: Types.ObjectId
}

export default IGame