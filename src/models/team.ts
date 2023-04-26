import { Schema, model, SchemaTypes } from 'mongoose'
import ITeam from '../types/team'

export const teamDataSchema = {
    wins: { type: Number, required: true, default: 0 },
    losses: { type: Number, required: true, default: 0 },
    goalsFor: { type: Number, required: true, default: 0 },
    goalsAgainst: { type: Number, required: true, default: 0 },
    holds: { type: Number, required: true, default: 0 },
    breaks: { type: Number, required: true, default: 0 },
    turnoverFreeHolds: { type: Number, required: true, default: 0 },
    offensePoints: { type: Number, required: true, default: 0 },
    defensePoints: { type: Number, required: true, default: 0 },
    turnovers: { type: Number, required: true, default: 0 },
    turnoversForced: { type: Number, required: true, default: 0 },
}

const schema = new Schema<ITeam>(
    {
        place: { type: String, required: true },
        name: { type: String, required: true },
        teamname: { type: String, required: true },
        seasonStart: { type: Date, required: false },
        seasonEnd: { type: Date, required: false },
        players: [SchemaTypes.ObjectId],
        games: [SchemaTypes.ObjectId],
        ...teamDataSchema,
    },
    { toJSON: { virtuals: true }, toObject: { virtuals: true } },
)

schema.virtual('winPercentage').get(function () {
    return this.wins / (this.wins + this.losses)
})

schema.virtual('offensiveConversion').get(function () {
    return this.holds / this.offensePoints
})

schema.virtual('defensiveConversion').get(function () {
    return this.breaks / this.defensePoints
})

const Team = model<ITeam>('Team', schema)
export type ITeamModel = typeof Team
export default Team
