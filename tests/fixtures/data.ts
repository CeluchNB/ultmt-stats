import { Types } from 'mongoose'
import { EmbeddedPlayer } from '../../src/types/player'

export const teamOne = {
    _id: new Types.ObjectId(),
    place: 'Pittsburgh',
    name: 'Temper',
    teamName: 'pghtemper',
    seasonStart: new Date(),
    seasonEnd: new Date(),
}

export const teamTwo = {
    _id: new Types.ObjectId(),
    place: 'Pittsburgh',
    name: 'Hazard',
    teamName: 'hazzy',
    seasonStart: new Date(),
    seasonEnd: new Date(),
}

export const getPlayer = (num: number): EmbeddedPlayer => {
    return {
        _id: new Types.ObjectId(),
        firstName: `First ${num}`,
        lastName: `Last ${num}`,
        username: `firstlast${num}`,
    }
}
