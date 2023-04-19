import { Schema, model, SchemaTypes } from 'mongoose'
import IPlayer from '../types/player'

const schema = new Schema<IPlayer>(
    {
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
    },
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    },
)

schema.virtual('plusMinus').get(function () {
    return this.goals + this.assists + this.blocks - this.throwaways - this.drops
})

schema.virtual('catchingPercentage').get(function () {
    return Number(this.catches / (this.catches + this.drops)).toPrecision(2)
})

schema.virtual('throwingPercentage').get(function () {
    return Number(this.completedPasses / (this.completedPasses + this.throwaways + this.droppedPasses)).toPrecision(2)
})

schema.virtual('ppGoals').get(function () {
    return Number(this.goals / this.pointsPlayed).toPrecision(2)
})

schema.virtual('ppAssists').get(function () {
    return Number(this.assists / this.pointsPlayed).toPrecision(2)
})

schema.virtual('ppThrowaways').get(function () {
    return Number(this.throwaways / this.pointsPlayed).toPrecision(2)
})

schema.virtual('ppDrops').get(function () {
    return Number(this.drops / this.pointsPlayed).toPrecision(2)
})

schema.virtual('ppBlocks').get(function () {
    return Number(this.blocks / this.pointsPlayed).toPrecision(2)
})

const Player = model<IPlayer>('Player', schema)
export type IPlayerModel = typeof Player
export default Player
