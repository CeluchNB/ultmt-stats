import { model, Schema, SchemaTypes } from 'mongoose'
import { IAtomicTeam } from '../types/atomic-stat'

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
    completionsToTurnover: [{ type: Number }],
    completionsToScore: [{ type: Number }],
}

const schema = new Schema<IAtomicTeam>({
    teamId: { type: SchemaTypes.ObjectId, required: true },
    gameId: { type: SchemaTypes.ObjectId, required: true },
    place: { type: String, required: true },
    name: { type: String, required: true },
    teamname: { type: String, required: true },
    seasonStart: { type: Date, required: false },
    seasonEnd: { type: Date, required: false },
    players: [SchemaTypes.ObjectId],
    ...teamDataSchema,
})

schema.index({ gameId: 1, teamId: 1 }, { unique: true })

const AtomicTeam = model<IAtomicTeam>('AtomicTeam', schema)
export type IAtomicTeamModel = typeof AtomicTeam
export default AtomicTeam
