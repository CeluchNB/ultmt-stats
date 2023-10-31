import { Types } from 'mongoose'

export interface IConnection {
    throwerId: Types.ObjectId
    receiverId: Types.ObjectId
    catches: number
    drops: number
    scores: number
}
