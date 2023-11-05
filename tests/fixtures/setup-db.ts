import { connect, connection } from 'mongoose'
import Game from '../../src/models/game'
import Player from '../../src/models/player'
import AtomicPlayer from '../../src/models/atomic-player'
import AtomicTeam from '../../src/models/atomic-team'
import AtomicConnection from '../../src/models/atomic-connection'

export const setUpDatabase = async () => {
    await connect(process.env.MONGOOSE_URL as string)
}

export const resetDatabase = async () => {
    await Game.deleteMany({})
    await Player.deleteMany({})
    await AtomicPlayer.deleteMany({})
    await AtomicTeam.deleteMany({})
    await AtomicConnection.deleteMany({})
}

export const tearDownDatabase = () => {
    connection.close()
}
