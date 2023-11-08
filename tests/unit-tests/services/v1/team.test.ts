import * as Constants from '../../../../src/utils/constants'
import { setUpDatabase, tearDownDatabase, resetDatabase } from '../../../fixtures/setup-db'
import { getPlayer, teamOne } from '../../../fixtures/data'
import { getInitialTeamData } from '../../../../src/utils/team-stats'
import { filterTeamStats, getTeamById } from '../../../../src/services/v1/team'
import { Types } from 'mongoose'
import { ApiError } from '../../../../src/types/error'
import AtomicTeam from '../../../../src/models/atomic-team'
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

describe('test get team by id', () => {
    it('with found team', async () => {
        const gameId = new Types.ObjectId()
        const playerOne = getPlayer(1)
        const playerTwo = getPlayer(2)

        await AtomicTeam.create({
            ...teamOne,
            gameId,
            teamId: teamOne._id,
            ...getInitialTeamData({
                goalsFor: 1,
                goalsAgainst: 1,
                wins: 1,
                losses: 1,
                offensePoints: 5,
                holds: 4,
                defensePoints: 5,
                breaks: 1,
            }),
        })

        await AtomicPlayer.create({
            teamId: teamOne._id,
            gameId: new Types.ObjectId(),
            playerId: playerOne._id,
            ...playerOne,
            _id: new Types.ObjectId(),
            goals: 1,
            assists: 2,
            blocks: 3,
        })
        await AtomicPlayer.create({
            teamId: teamOne._id,
            gameId: new Types.ObjectId(),
            playerId: new Types.ObjectId(),
            ...playerTwo,
            _id: new Types.ObjectId(0),
            goals: 99,
            assists: 99,
            blocks: 99,
        })

        const team = await getTeamById(teamOne._id.toHexString())
        expect(team).toMatchObject({
            ...teamOne,
            ...getInitialTeamData({
                goalsFor: 1,
                goalsAgainst: 1,
                wins: 1,
                losses: 1,
                offensePoints: 5,
                holds: 4,
                defensePoints: 5,
                breaks: 1,
            }),
            games: [gameId],
            winPercentage: 0.5,
            offensiveConversion: 0.8,
            defensiveConversion: 0.2,
            goalsLeader: {
                total: 99,
                player: {
                    firstName: playerTwo.firstName,
                },
            },
            assistsLeader: {
                total: 99,
                player: {
                    firstName: playerTwo.firstName,
                },
            },
            blocksLeader: {
                total: 99,
                player: {
                    firstName: playerTwo.firstName,
                },
            },
        })
        expect(team.players.length).toBe(2)
        expect(team.players[0]).toMatchObject({
            goals: 1,
            assists: 2,
            blocks: 3,
            plusMinus: 6,
            throwaways: 0,
        })
    })

    it('with missing team', async () => {
        await expect(getTeamById(new Types.ObjectId().toHexString())).rejects.toThrowError(
            new ApiError(Constants.TEAM_NOT_FOUND, 404),
        )
    })
})

describe('test filter team stats', () => {
    it('with team', async () => {
        const gameOneId = new Types.ObjectId()
        const gameTwoId = new Types.ObjectId()
        const gameThreeId = new Types.ObjectId()

        await AtomicTeam.create({
            ...teamOne,
            _id: new Types.ObjectId(),
            teamId: teamOne._id,
            gameId: gameOneId,
            ...getInitialTeamData({ goalsFor: 1, goalsAgainst: 2, wins: 0, losses: 1 }),
        })
        await AtomicTeam.create({
            ...teamOne,
            _id: new Types.ObjectId(),
            teamId: teamOne._id,
            gameId: gameTwoId,
            ...getInitialTeamData({ goalsFor: 5, goalsAgainst: 4, wins: 1, losses: 0 }),
        })

        await AtomicTeam.create({
            ...teamOne,
            _id: new Types.ObjectId(),
            teamId: teamOne._id,
            gameId: gameThreeId,
            ...getInitialTeamData({ goalsFor: 5, goalsAgainst: 4, wins: 1, losses: 0 }),
        })
        const playerOne = getPlayer(1)
        await AtomicPlayer.create({
            teamId: teamOne._id,
            gameId: gameOneId,
            playerId: playerOne._id,
            ...playerOne,
            _id: new Types.ObjectId(),
            goals: 1,
            assists: 2,
            blocks: 3,
        })
        await AtomicPlayer.create({
            teamId: teamOne._id,
            gameId: gameTwoId,
            playerId: playerOne._id,
            ...playerOne,
            _id: new Types.ObjectId(),
            goals: 5,
            assists: 4,
            blocks: 3,
        })

        const result = await filterTeamStats(teamOne._id.toHexString(), [
            gameOneId.toHexString(),
            gameTwoId.toHexString(),
        ])

        expect(result).toMatchObject({
            _id: teamOne._id,
            name: teamOne.name,
            goalsFor: 6,
            goalsAgainst: 6,
            wins: 1,
            losses: 1,
            goalsLeader: {
                total: 6,
                player: {
                    firstName: playerOne.firstName,
                },
            },
            assistsLeader: {
                total: 6,
                player: {
                    firstName: playerOne.firstName,
                },
            },
            blocksLeader: {
                total: 6,
                player: {
                    firstName: playerOne.firstName,
                },
            },
        })
        expect(result.players.length).toBe(1)
        expect(result.players[0]).toMatchObject({
            goals: 6,
            assists: 6,
            blocks: 6,
            plusMinus: 18,
            throwaways: 0,
        })
    })

    it('with unfound team', async () => {
        await expect(filterTeamStats(new Types.ObjectId().toHexString(), [])).rejects.toThrowError(
            new ApiError(Constants.TEAM_NOT_FOUND, 404),
        )
    })
})
