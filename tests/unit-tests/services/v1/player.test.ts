import * as Constants from '../../../../src/utils/constants'
import { resetDatabase, setUpDatabase, tearDownDatabase } from '../../../fixtures/setup-db'
import Player from '../../../../src/models/player'
import { getPlayerById } from '../../../../src/services/v1/player'
import { Types } from 'mongoose'
import { ApiError } from '../../../../src/types/error'
import { getPlayer } from '../../../fixtures/data'
import { getInitialPlayerData } from '../../../../src/utils/player-stats'

beforeAll(async () => {
    await setUpDatabase()
})

afterEach(async () => {
    await resetDatabase()
})

afterAll(async () => {
    await tearDownDatabase()
})

describe('test getPlayerById', () => {
    it('with unfound player', async () => {
        await expect(getPlayerById(new Types.ObjectId().toString())).rejects.toThrowError(
            new ApiError(Constants.PLAYER_NOT_FOUND, 404),
        )
    })

    it('with found player', async () => {
        const playerData = getPlayer(1)
        await Player.create({
            ...playerData,
            ...getInitialPlayerData({
                goals: 1,
                assists: 1,
                blocks: 2,
                pointsPlayed: 4,
                catches: 10,
                drops: 1,
                completedPasses: 5,
                droppedPasses: 1,
                throwaways: 1,
                wins: 1,
                losses: 1,
            }),
        })

        const result = await getPlayerById(playerData._id.toHexString())

        expect(result).toMatchObject({
            ...getInitialPlayerData({
                goals: 1,
                assists: 1,
                blocks: 2,
                pointsPlayed: 4,
                catches: 10,
                drops: 1,
                completedPasses: 5,
                droppedPasses: 1,
                throwaways: 1,
                wins: 1,
                losses: 1,
            }),
            plusMinus: 2,
            throwingPercentage: 5 / 7,
            catchingPercentage: 10 / 11,
            ppGoals: 0.25,
            ppAssists: 0.25,
            ppBlocks: 0.5,
            ppDrops: 0.25,
            ppThrowaways: 0.25,
            winPercentage: 0.5,
        })
    })
})
