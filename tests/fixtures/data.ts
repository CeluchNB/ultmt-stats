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

// export const playerOne = {
//     _id: new Types.ObjectId(),
//     firstName: 'First 1',
//     lastName: 'Last 1',
//     username: 'firstlast1',
// }

// export const playerTwo = {
//     _id: new Types.ObjectId(),
//     firstName: 'First 2',
//     lastName: 'Last 2',
//     username: 'firstlast2',
// }

export const getPlayer = (num: number): EmbeddedPlayer => {
    return {
        _id: new Types.ObjectId(),
        firstName: `First ${num}`,
        lastName: `Last ${num}`,
        username: `firstlast${num}`,
    }
}
