import { createGame } from '../../../../src/services/v1/game'
import { resetDatabase, setUpDatabase, tearDownDatabase } from '../../../fixtures/setup-db'
import { Types } from 'mongoose'
import Game from '../../../../src/models/game'
import Team from '../../../../src/models/team'
import AtomicStat from '../../../../src/models/atomic-stat'
import { teamOne, teamTwo, getPlayer } from '../../../fixtures/data'

beforeAll(async () => {
    await setUpDatabase()
})

afterEach(async () => {
    await resetDatabase()
})

afterAll(async () => {
    await tearDownDatabase()
})

describe('test create game', () => {
    const _id = new Types.ObjectId()
    const startTime = new Date()
    const playerOne = getPlayer(1)
    const playerTwo = getPlayer(2)

    it('with simple data', async () => {
        await createGame({
            _id: _id.toHexString(),
            startTime,
            teamOne,
            teamTwo: {},
            teamOnePlayers: [],
            teamTwoPlayers: [],
        })

        const game = await Game.findById(_id)
        expect(game?.teamOneId.toString()).toEqual(teamOne._id.toString())
        expect(game?.assistsLeader).toMatchObject({})
        expect(game?.points.length).toBe(0)

        const team = await Team.findById(teamOne._id)
        expect(team).toMatchObject(teamOne)
        expect(team?.games.length).toBe(1)
        expect(team?.games[0].toString()).toBe(_id.toString())

        const stats = await AtomicStat.find({})
        expect(stats.length).toBe(0)
    })

    it('with team two and players', async () => {
        await createGame({
            _id: _id.toHexString(),
            startTime,
            teamOne,
            teamTwo,
            teamOnePlayers: [playerOne],
            teamTwoPlayers: [playerTwo],
        })
        const game = await Game.findById(_id)
        expect(game?.teamOneId.toString()).toEqual(teamOne._id.toString())
        expect(game?.assistsLeader.player).toMatchObject({})
        expect(game?.points.length).toBe(0)

        const teamOneRecord = await Team.findById(teamOne._id)
        expect(teamOneRecord).toMatchObject(teamOne)
        expect(teamOneRecord?.games.length).toBe(1)
        expect(teamOneRecord?.games[0].toString()).toBe(_id.toString())

        const teamTwoRecord = await Team.findById(teamTwo._id)
        expect(teamTwoRecord).toMatchObject(teamTwo)
        expect(teamTwoRecord?.games.length).toBe(1)
        expect(teamTwoRecord?.games[0].toString()).toBe(_id.toString())

        const stats = await AtomicStat.find({})
        expect(stats.length).toBe(2)
    })

    it('with team two players but no team two', async () => {
        await createGame({
            _id: _id.toHexString(),
            startTime,
            teamOne,
            teamTwo: {},
            teamOnePlayers: [playerOne],
            teamTwoPlayers: [playerTwo],
        })

        const game = await Game.findById(_id)
        expect(game?.teamOneId.toString()).toEqual(teamOne._id.toString())

        const teamOneRecord = await Team.findById(teamOne._id)
        expect(teamOneRecord).toMatchObject(teamOne)

        const teamTwoRecord = await Team.findById(teamTwo._id)
        expect(teamTwoRecord).toBeNull()

        const stats = await AtomicStat.find({})
        expect(stats.length).toBe(1)
    })

    it('with previously existing game', async () => {
        await Game.create({
            _id,
            startTime: new Date(),
            teamOneId: new Types.ObjectId(),
            teamTwoId: new Types.ObjectId(),
            goalsLeader: {
                player: undefined,
                total: 0,
            },
            assistsLeader: {
                player: undefined,
                total: 0,
            },
            blocksLeader: {
                player: undefined,
                total: 0,
            },
            turnoversLeader: {
                player: undefined,
                total: 0,
            },
            pointsPlayedLeader: {
                player: undefined,
                total: 0,
            },
            plusMinusLeader: {
                player: undefined,
                total: 0,
            },
        })

        await expect(
            createGame({
                _id: _id.toHexString(),
                startTime,
                teamOne,
                teamTwo: {},
                teamOnePlayers: [],
                teamTwoPlayers: [],
            }),
        ).rejects.toThrowError()

        const games = await Game.find({})
        expect(games.length).toBe(1)

        const teams = await Team.find({})
        expect(teams.length).toBe(0)
    })
})
