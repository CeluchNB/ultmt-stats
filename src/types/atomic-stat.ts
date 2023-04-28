import { Types } from 'mongoose'
import { CalculatedPlayerData, PlayerData } from './player'
import { TeamData } from './team'

export interface IAtomicPlayer extends PlayerData, CalculatedPlayerData {
    playerId: Types.ObjectId
    gameId: Types.ObjectId
    teamId: Types.ObjectId
}

export interface IAtomicTeam extends TeamData {
    teamId: Types.ObjectId
    gameId: Types.ObjectId
}
