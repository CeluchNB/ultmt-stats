import { Schema, model, SchemaTypes } from 'mongoose'
import IPlayer from '../types/player'

const schema = new Schema<IPlayer>({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    username: { type: String, required: true },
    goals: { type: Number, required: true, default: 0 },
    assists: { type: Number, required: true, default: 0 },
    blocks: { type: Number, required: true, default: 0 },
    throwaways: { type: Number, required: true, default: 0 },
    drops: { type: Number, required: true, default: 0 },
    stalls: { type: Number, required: true, default: 0 },
    touches: { type: Number, required: true, default: 0 },
    catches: { type: Number, required: true, default: 0 },
    completedPasses: { type: Number, required: true, default: 0 },
    droppedPasses: { type: Number, required: true, default: 0 },
    callahans: { type: Number, required: true, default: 0 },
    pointsPlayed: { type: Number, required: true, default: 0 },
    pulls: { type: Number, required: true, default: 0 },
    wins: { type: Number, required: true, default: 0 },
    losses: { type: Number, required: true, default: 0 },
    games: [SchemaTypes.ObjectId],
    teams: [SchemaTypes.ObjectId],
})

const Player = model<IPlayer>('Player', schema)
export type IPlayerModel = typeof Player
export default Player
