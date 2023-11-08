import * as Constants from '../../../../src/utils/constants'
import { resetDatabase, setUpDatabase, tearDownDatabase } from '../../../fixtures/setup-db'
import request from 'supertest'
import { teamOne } from '../../../fixtures/data'
import { getInitialTeamData } from '../../../../src/utils/team-stats'
import app from '../../../../src/app'
import { Types } from 'mongoose'
import AtomicTeam from '../../../../src/models/atomic-team'

beforeAll(async () => {
    await setUpDatabase()
})

afterEach(async () => {
    await resetDatabase()
})

afterAll(async () => {
    await tearDownDatabase()
})

describe('/GET team by id', () => {
    it('with found team', async () => {
        await AtomicTeam.create({
            ...teamOne,
            gameId: new Types.ObjectId(),
            teamId: teamOne._id,
            _id: new Types.ObjectId(),
            ...getInitialTeamData({ goalsFor: 1, goalsAgainst: 1, wins: 1 }),
        })
        const response = await request(app).get(`/api/v1/stats/team/${teamOne._id}`).expect(200)
        const { team } = response.body
        expect(team).toMatchObject({
            teamId: teamOne._id.toHexString(),
            name: teamOne.name,
            ...getInitialTeamData({ goalsFor: 1, goalsAgainst: 1, wins: 1 }),
        })
    })

    it('with unfound team', async () => {
        const response = await request(app).get(`/api/v1/stats/team/${new Types.ObjectId()}`).expect(404)
        expect(response.body.message).toBe(Constants.TEAM_NOT_FOUND)
    })
})

describe('/GET filter team stats', () => {
    const gameOneId = new Types.ObjectId()
    const gameTwoId = new Types.ObjectId()
    const gameThreeId = new Types.ObjectId()

    beforeEach(async () => {
        await AtomicTeam.create({
            teamId: teamOne._id,
            gameId: gameOneId,
            ...teamOne,
            _id: new Types.ObjectId(),
            ...getInitialTeamData({ goalsFor: 1, goalsAgainst: 2, wins: 0, losses: 1 }),
        })
        await AtomicTeam.create({
            teamId: teamOne._id,
            gameId: gameTwoId,
            ...teamOne,
            _id: new Types.ObjectId(),
            ...getInitialTeamData({ goalsFor: 5, goalsAgainst: 4, wins: 1, losses: 0 }),
        })

        await AtomicTeam.create({
            teamId: teamOne._id,
            gameId: gameThreeId,
            ...teamOne,
            _id: new Types.ObjectId(),
            ...getInitialTeamData({ goalsFor: 5, goalsAgainst: 4, wins: 1, losses: 0 }),
        })
    })

    it('with team', async () => {
        const response = await request(app)
            .get(`/api/v1/stats/filter/team/${teamOne._id}?games=${gameOneId},${gameTwoId}`)
            .expect(200)

        const { team } = response.body
        expect(team).toMatchObject({
            _id: teamOne._id.toHexString(),
            name: teamOne.name,
            goalsFor: 6,
            goalsAgainst: 6,
            wins: 1,
            losses: 1,
        })
    })

    it('with unfound team', async () => {
        const response = await request(app)
            .get(`/api/v1/stats/filter/team/${new Types.ObjectId()}?games=${gameOneId},${gameTwoId}`)
            .expect(404)

        expect(response.body.message).toBe(Constants.TEAM_NOT_FOUND)
    })
})
