import { connect, connection, Types } from 'mongoose'
import Game from '../../src/models/game'
import Team from '../../src/models/team'
import Player from '../../src/models/player'
import AtomicStat from '../../src/models/atomic-stat'

export const setUpDatabase = async () => {
    await connect(process.env.MONGOOSE_URL as string)
}

export const resetDatabase = async () => {
    await Game.deleteMany({})
    await Team.deleteMany({})
    await Player.deleteMany({})
    await AtomicStat.deleteMany({})
}

export const tearDownDatabase = () => {
    connection.close()
}