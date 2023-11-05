import { Types } from 'mongoose'
import { CalculatedPlayerData, PlayerData } from './player'
import { EmbeddedTeam, TeamData } from './team'
import { IConnection } from './connection'

export interface IAtomicPlayer extends PlayerData, CalculatedPlayerData {
    _id: Types.ObjectId
    playerId: Types.ObjectId
    gameId: Types.ObjectId
    teamId: Types.ObjectId
    toJSON: () => IAtomicPlayer
}

export interface IAtomicTeam extends TeamData, EmbeddedTeam {
    teamId: Types.ObjectId
    gameId: Types.ObjectId
    players: Types.ObjectId[]
}

export interface IAtomicConnection extends IConnection {
    gameId: Types.ObjectId
    teamId: Types.ObjectId
}
