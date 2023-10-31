import { model, Schema, SchemaTypes } from 'mongoose'
import { IConnection } from '../types/connection'

export const connectionSchema = {
    throwerId: { type: SchemaTypes.ObjectId, required: true },
    receiverId: { type: SchemaTypes.ObjectId, required: true },
    catches: { type: Number, required: true, default: 0 },
    drops: { type: Number, required: true, default: 0 },
    scores: { type: Number, required: true, default: 0 },
}

const schema = new Schema<IConnection>(connectionSchema)

schema.index({ throwerId: 1, receiverId: 1 }, { unique: true })

const Connection = model<IConnection>('Connection', schema)
export type IConnectionModel = typeof Connection
export default Connection
