import { model, Schema, SchemaTypes } from 'mongoose'
import { IAtomicConnection } from '../types/atomic-stat'

export const connectionSchema = {
    throwerId: { type: SchemaTypes.ObjectId, required: true },
    receiverId: { type: SchemaTypes.ObjectId, required: true },
    catches: { type: Number, required: true, default: 0 },
    drops: { type: Number, required: true, default: 0 },
    scores: { type: Number, required: true, default: 0 },
}

const schema = new Schema<IAtomicConnection>({
    ...connectionSchema,
    gameId: { type: SchemaTypes.ObjectId, required: true },
    teamId: { type: SchemaTypes.ObjectId, required: true },
})

const AtomicConnection = model<IAtomicConnection>('AtomicConnection', schema)
export type IAtomicConnectionModel = typeof AtomicConnection
export default AtomicConnection
