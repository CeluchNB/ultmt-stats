import { Types } from 'mongoose'
import { PlayerData } from './player'

interface IAtomicStat extends PlayerData {
    playerId: Types.ObjectId
    gameId: Types.ObjectId
    teamId: Types.ObjectId
}

export default IAtomicStat
