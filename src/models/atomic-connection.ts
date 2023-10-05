import { model, Schema, SchemaTypes } from 'mongoose'
import { connectionSchema } from './connection'
import { IAtomicConnection } from '../types/atomic-stat'

const schema = new Schema<IAtomicConnection>({
    ...connectionSchema,
    gameId: { type: SchemaTypes.ObjectId, required: true },
    teamId: { type: SchemaTypes.ObjectId, required: true },
})

const AtomicConnection = model<IAtomicConnection>('AtomicConnection', schema)
export type IAtomicConnectionModel = typeof AtomicConnection
export default AtomicConnection
