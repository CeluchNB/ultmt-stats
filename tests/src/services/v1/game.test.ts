import { createGame } from '../../../../src/services/v1/game'
import { resetDatabase, setUpDatabase, tearDownDatabase } from '../../../fixtures/setup-db'
import { Types } from 'mongoose'
import Game from '../../../../src/models/game'
import Team from '../../../../src/models/team'
import AtomicStat from '../../../../src/models/atomic-stat'

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
    const teamOne = {
        _id: new Types.ObjectId(),
        place: 'Pittsburgh',
        name: 'Temper',
        teamName: 'pghtemper',
        seasonStart: new Date(),
        seasonEnd: new Date(),
    }

    const teamTwo = {
        _id: new Types.ObjectId(),
        place: 'Pittsburgh',
        name: 'Hazard',
        teamName: 'hazzy',
        seasonStart: new Date(),
        seasonEnd: new Date(),
    }

    const playerOne = {
        _id: new Types.ObjectId(),
        firstName: 'First1',
        lastName: 'Last1',
        username: 'firstlast1'
    }

    const playerTwo = {
        _id: new Types.ObjectId(),
        firstName: 'First2',
        lastName: 'Last2',
        username: 'firstlast1'
    }

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
        expect(game?.assistsLeader).toBeUndefined()
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
        expect(game?.assistsLeader).toBeUndefined()
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
        })
        
        await createGame({
            _id: _id.toHexString(),
            startTime,
            teamOne,
            teamTwo: {},
            teamOnePlayers: [],
            teamTwoPlayers: [],
        })

        const games = await Game.find({})
        expect(games.length).toBe(1)

        const teams = await Team.find({})
        expect(teams.length).toBe(0)
    })

    

})