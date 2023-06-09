import { Types } from 'mongoose'
import { CalculatedPlayerData, PlayerData } from './player'
import { TeamData } from './team'

export interface IAtomicPlayer extends PlayerData, CalculatedPlayerData {
    _id: Types.ObjectId
    playerId: Types.ObjectId
    gameId: Types.ObjectId
    teamId: Types.ObjectId
    toJSON: () => IAtomicPlayer
}

export interface IAtomicTeam extends TeamData {
    teamId: Types.ObjectId
    gameId: Types.ObjectId
}
