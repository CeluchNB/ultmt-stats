import { Schema, model, SchemaTypes } from 'mongoose'
import IGame, { IPoint, MomentumPoint } from '../types/game'
import { teamDataSchema } from './atomic-team'
import { connectionSchema } from './atomic-connection'

const momentumDataSchema = new Schema<MomentumPoint>(
    {
        x: { type: Number, required: true },
        y: { type: Number, required: true },
        pointId: { type: SchemaTypes.ObjectId, required: false },
    },
    { _id: false },
)

const pointSchema = new Schema<IPoint>({
    players: [
        {
            _id: { type: SchemaTypes.ObjectId, required: true },
            goals: { type: Number, required: true, default: 0 },
            assists: { type: Number, required: true, default: 0 },
            hockeyAssists: { type: Number, required: true, default: 0 },
            blocks: { type: Number, required: true, default: 0 },
            throwaways: { type: Number, required: true, default: 0 },
            drops: { type: Number, required: true, default: 0 },
            stalls: { type: Number, required: true, default: 0 },
            touches: { type: Number, required: true, default: 0 },
            catches: { type: Number, required: true, default: 0 },
            completedPasses: { type: Number, required: true, default: 0 },
            attemptedPasses: { type: Number, required: true, default: 0 },
            droppedPasses: { type: Number, required: true, default: 0 },
            pulls: { type: Number, required: true, default: 0 },
            callahans: { type: Number, required: true, default: 0 },
            pointsPlayed: { type: Number, required: true, default: 0 },
            offensePoints: { type: Number, required: true, default: 0 },
            defensePoints: { type: Number, required: true, default: 0 },
            holds: { type: Number, required: true, default: 0 },
            breaks: { type: Number, required: true, default: 0 },
            wins: { type: Number, required: true, default: 0 },
            losses: { type: Number, required: true, default: 0 },
        },
    ],
    connections: [connectionSchema],
    teamOne: {
        type: teamDataSchema,
        required: true,
    },
    teamTwo: {
        type: teamDataSchema,
        required: true,
    },
})

const schema = new Schema<IGame>({
    startTime: Date,
    teamOneId: { type: SchemaTypes.ObjectId, required: true },
    teamTwoId: { type: SchemaTypes.ObjectId, required: false },
    winningTeam: { type: String, enum: ['one', 'two'], required: false },
    points: [pointSchema],
    momentumData: [momentumDataSchema],
})

const Game = model<IGame>('Game', schema)
export type IGameModel = typeof Game
export default Game
