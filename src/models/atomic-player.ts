import { model, Schema, SchemaTypes } from 'mongoose'
import { IAtomicPlayer } from '../types/atomic-stat'
import { createSafeFraction } from '../utils/utils'

const schema = new Schema<IAtomicPlayer>(
    {
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
        wins: { type: Number, required: true, default: 0 },
        losses: { type: Number, required: true, default: 0 },
        pulls: { type: Number, required: true, default: 0 },
        playerId: { type: SchemaTypes.ObjectId, required: true },
        gameId: { type: SchemaTypes.ObjectId, required: true },
        teamId: { type: SchemaTypes.ObjectId, required: true },
    },
    { toJSON: { virtuals: true }, toObject: { virtuals: true } },
)

schema.index({ playerId: 1, gameId: 1, teamId: 1 }, { unique: true })

schema.virtual('plusMinus').get(function () {
    return this.goals + this.assists + this.blocks - this.throwaways - this.drops
})

schema.virtual('catchingPercentage').get(function () {
    return createSafeFraction(this.catches, this.catches + this.drops)
})

schema.virtual('throwingPercentage').get(function () {
    return createSafeFraction(this.completedPasses, this.completedPasses + this.throwaways + this.droppedPasses)
})

schema.virtual('ppGoals').get(function () {
    return createSafeFraction(this.goals, this.pointsPlayed)
})

schema.virtual('ppAssists').get(function () {
    return createSafeFraction(this.assists, this.pointsPlayed)
})

schema.virtual('ppThrowaways').get(function () {
    return createSafeFraction(this.throwaways, this.pointsPlayed)
})

schema.virtual('ppDrops').get(function () {
    return createSafeFraction(this.drops, this.pointsPlayed)
})

schema.virtual('ppBlocks').get(function () {
    return createSafeFraction(this.blocks, this.pointsPlayed)
})

schema.virtual('winPercentage').get(function () {
    return createSafeFraction(this.wins, this.wins + this.losses)
})

const AtomicPlayer = model<IAtomicPlayer>('AtomicPlayer', schema)
export type IAtomicPlayerModel = typeof AtomicPlayer
export default AtomicPlayer
