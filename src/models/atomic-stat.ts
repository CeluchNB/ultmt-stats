import { model, Schema, SchemaTypes } from 'mongoose'
import IAtomicStat from '../types/atomic-stat'

const schema = new Schema<IAtomicStat>({
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
    playerId: { type: SchemaTypes.ObjectId, required: true, unique: true },
    gameId: { type: SchemaTypes.ObjectId, required: true },
    teamId: { type: SchemaTypes.ObjectId, required: true },
})

const AtomicStat = model<IAtomicStat>('AtomicStat', schema)
export type IAtomicStatModel = typeof AtomicStat
export default AtomicStat
