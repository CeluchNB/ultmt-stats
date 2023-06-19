import * as Constants from '../../../../src/utils/constants'
import { resetDatabase, setUpDatabase, tearDownDatabase } from '../../../fixtures/setup-db'
import Player from '../../../../src/models/player'
import { getPlayerById, filterPlayerStats } from '../../../../src/services/v1/player'
import { Types } from 'mongoose'
import { ApiError } from '../../../../src/types/error'
import { getPlayer, teamOne, teamTwo } from '../../../fixtures/data'
import { getInitialPlayerData } from '../../../../src/utils/player-stats'
import AtomicPlayer from '../../../../src/models/atomic-player'

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

describe('test playerFilter', () => {
    const playerOne = getPlayer(1)
    const playerTwo = getPlayer(2)
    const gameOneId = new Types.ObjectId()
    const gameTwoId = new Types.ObjectId()
    const gameThreeId = new Types.ObjectId()

    beforeEach(async () => {
        await AtomicPlayer.create({
            playerId: playerOne._id,
            gameId: gameOneId,
            teamId: teamOne._id,
            ...getInitialPlayerData({ goals: 1 }),
        })

        await AtomicPlayer.create({
            playerId: playerOne._id,
            gameId: gameTwoId,
            teamId: teamOne._id,
            ...getInitialPlayerData({ assists: 1 }),
        })

        await AtomicPlayer.create({
            playerId: playerOne._id,
            gameId: gameThreeId,
            teamId: teamOne._id,
            ...getInitialPlayerData({ throwaways: 1 }),
        })

        await AtomicPlayer.create({
            playerId: playerTwo._id,
            gameId: gameTwoId,
            teamId: teamTwo._id,
            ...getInitialPlayerData({ blocks: 1 }),
        })
    })

    it('gets accurate stats by game', async () => {
        const result = await filterPlayerStats(
            playerOne._id.toHexString(),
            [gameOneId.toHexString(), gameTwoId.toHexString()],
            [],
        )

        expect(result.length).toBe(2)
        expect(result[0].goals).toBe(1)
        expect(result[1].assists).toBe(1)
        expect(result[0].plusMinus).toBe(1)
        expect(result[1].plusMinus).toBe(1)
    })

    it('gets accurate stats by team', async () => {
        const result = await filterPlayerStats(playerOne._id.toHexString(), [], [teamOne._id.toHexString()])
        expect(result.length).toBe(3)
        expect(result[0].goals).toBe(1)
        expect(result[1].assists).toBe(1)
        expect(result[2].throwaways).toBe(1)
        expect(result[0].plusMinus).toBe(1)
        expect(result[1].plusMinus).toBe(1)
        expect(result[2].plusMinus).toBe(-1)
        expect(result[0].throwingPercentage).toBe(0)
    })

    it('gets accurate overlapping stats', async () => {
        const result = await filterPlayerStats(
            playerOne._id.toHexString(),
            [gameOneId.toHexString(), gameTwoId.toHexString()],
            [teamOne._id.toHexString()],
        )

        expect(result.length).toBe(2)
        expect(result[0].goals).toBe(1)
        expect(result[1].assists).toBe(1)
    })
})
