import { connect, connection } from 'mongoose'
import Game from '../../src/models/game'
import Team from '../../src/models/team'
import Player from '../../src/models/player'
import AtomicPlayer from '../../src/models/atomic-player'
import AtomicTeam from '../../src/models/atomic-team'

export const setUpDatabase = async () => {
    await connect(process.env.MONGOOSE_URL as string)
}

export const resetDatabase = async () => {
    await Game.deleteMany({})
    await Team.deleteMany({})
    await Player.deleteMany({})
    await AtomicPlayer.deleteMany({})
    await AtomicTeam.deleteMany({})
}

export const tearDownDatabase = () => {
    connection.close()
}
