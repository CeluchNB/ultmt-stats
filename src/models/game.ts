import { Schema, model, SchemaTypes } from 'mongoose'
import IGame from '../types/game'

const schema = new Schema<IGame>({
    goalsLeader: {
        type: {
            player: {
                _id: SchemaTypes.ObjectId,
                firstName: String,
                lastName: String,
                username: String,
            },
            total: Number
        },
        required: false,
    },
    assistsLeader: {
        type: {
            player: {
                _id: SchemaTypes.ObjectId,
                firstName: String,
                lastName: String,
                username: String,
            },
            total: Number
        },
        required: false,
    },
    blocksLeader: {
        type: {
            player: {
                _id: SchemaTypes.ObjectId,
                firstName: String,
                lastName: String,
                username: String,
            },
            total: Number
        },
        required: false,
    },
    turnoverLeader: {
        type: {
            player: {
                _id: SchemaTypes.ObjectId,
                firstName: String,
                lastName: String,
                username: String,
            },
            total: Number
        },
        required: false,
    },
    plusMinusLeader: {
        type: {
            player: {
                _id: SchemaTypes.ObjectId,
                firstName: String,
                lastName: String,
                username: String,
            },
            total: Number
        },
        required: false,
    },
    pointsPlayedLeader: {
        type: {
            player: {
                _id: SchemaTypes.ObjectId,
                firstName: String,
                lastName: String,
                username: String,
            },
            total: Number
        },
        required: false,
    },
    teamOneId: { type: SchemaTypes.ObjectId, required: true },
    teamTwoId: { type: SchemaTypes.ObjectId, required: false },
})

const Game = model<IGame>('Game', schema)
export type IGameModel = typeof Game
export default Game
