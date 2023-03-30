import { Schema, model, SchemaTypes } from 'mongoose'
import IGame, { IPoint } from '../types/game'

const pointSchema = new Schema<IPoint>({
    players: [
        {
            _id: { type: SchemaTypes.ObjectId, required: true },
            goals: { type: Number, required: true, default: 0 },
            assists: { type: Number, required: true, default: 0 },
            blocks: { type: Number, required: true, default: 0 },
            throwaways: { type: Number, required: true, default: 0 },
            drops: { type: Number, required: true, default: 0 },
            stalls: { type: Number, required: true, default: 0 },
            touches: { type: Number, required: true, default: 0 },
            catches: { type: Number, required: true, default: 0 },
            completedPasses: { type: Number, required: true, default: 0 },
            attemptedPasses: { type: Number, required: true, default: 0 },
            callahans: { type: Number, required: true, default: 0 },
            pointsPlayed: { type: Number, required: true, default: 0 },
            wins: { type: Number, required: true, default: 0 },
            losses: { type: Number, required: true, default: 0 },
        },
    ],
    teamOne: {
        type: {
            _id: { type: SchemaTypes.ObjectId, required: true },
            wins: { type: Number, required: true, default: 0 },
            losses: { type: Number, required: true, default: 0 },
            goalsFor: { type: Number, required: true, default: 0 },
            goalsAgainst: { type: Number, required: true, default: 0 },
            holds: { type: Number, required: true, default: 0 },
            breaks: { type: Number, required: true, default: 0 },
            turnoverFreeHolds: { type: Number, required: true, default: 0 },
            offensePoints: { type: Number, required: true, default: 0 },
            defensePoints: { type: Number, required: true, default: 0 },
            turnovers: { type: Number, required: true, default: 0 },
            turnoversForced: { type: Number, required: true, default: 0 },
        },
        required: true,
    },
    teamTwo: {
        type: {
            _id: { type: SchemaTypes.ObjectId, required: true },
            wins: { type: Number, required: true, default: 0 },
            losses: { type: Number, required: true, default: 0 },
            goalsFor: { type: Number, required: true, default: 0 },
            goalsAgainst: { type: Number, required: true, default: 0 },
            holds: { type: Number, required: true, default: 0 },
            breaks: { type: Number, required: true, default: 0 },
            turnoverFreeHolds: { type: Number, required: true, default: 0 },
            offensePoints: { type: Number, required: true, default: 0 },
            defensePoints: { type: Number, required: true, default: 0 },
            turnovers: { type: Number, required: true, default: 0 },
            turnoversForced: { type: Number, required: true, default: 0 },
        },
        required: true,
    },
})

const schema = new Schema<IGame>({
    startTime: Date,
    goalsLeader: {
        type: {
            player: {
                _id: SchemaTypes.ObjectId,
                firstName: String,
                lastName: String,
                username: String,
            },
            total: Number,
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
            total: Number,
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
            total: Number,
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
            total: Number,
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
            total: Number,
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
            total: Number,
        },
        required: false,
    },
    teamOneId: { type: SchemaTypes.ObjectId, required: true },
    teamTwoId: { type: SchemaTypes.ObjectId, required: false },
    points: [pointSchema],
})

const Game = model<IGame>('Game', schema)
export type IGameModel = typeof Game
export default Game
