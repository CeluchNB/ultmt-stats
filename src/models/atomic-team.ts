import { model, Schema, SchemaTypes } from 'mongoose'
import { IAtomicTeam } from '../types/atomic-stat'
import { teamDataSchema } from './team'

const schema = new Schema<IAtomicTeam>({
    teamId: { type: SchemaTypes.ObjectId, required: true },
    gameId: { type: SchemaTypes.ObjectId, required: true },
    ...teamDataSchema,
})

schema.index({ gameId: 1, teamId: 1 }, { unique: true })

const AtomicTeam = model<IAtomicTeam>('AtomicTeam', schema)
export type IAtomicTeamModel = typeof AtomicTeam
export default AtomicTeam
