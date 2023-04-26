import { model, Schema, SchemaTypes } from 'mongoose'
import { IAtomicPlayer } from '../types/atomic-stat'

const schema = new Schema<IAtomicPlayer>({
    goals: { type: Number, required: true, default: 0 },
    assists: { type: Number, required: true, default: 0 },
    blocks: { type: Number, required: true, default: 0 },
    throwaways: { type: Number, required: true, default: 0 },
    drops: { type: Number, required: true, default: 0 },
    stalls: { type: Number, required: true, default: 0 },
    touches: { type: Number, required: true, default: 0 },
    catches: { type: Number, required: true, default: 0 },
    completedPasses: { type: Number, required: true, default: 0 },
    callahans: { type: Number, required: true, default: 0 },
    pointsPlayed: { type: Number, required: true, default: 0 },
    wins: { type: Number, required: true, default: 0 },
    losses: { type: Number, required: true, default: 0 },
    pulls: { type: Number, required: true, default: 0 },
    playerId: { type: SchemaTypes.ObjectId, required: true },
    gameId: { type: SchemaTypes.ObjectId, required: true },
    teamId: { type: SchemaTypes.ObjectId, required: true },
})

schema.index({ playerId: 1, gameId: 1, teamId: 1 }, { unique: true })

const AtomicPlayer = model<IAtomicPlayer>('AtomicPlayer', schema)
export type IAtomicPlayerModel = typeof AtomicPlayer
export default AtomicPlayer
