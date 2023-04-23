import * as Constants from '../../../../src/utils/constants'
import { resetDatabase, setUpDatabase, tearDownDatabase } from '../../../fixtures/setup-db'
import Team from '../../../../src/models/team'
import request from 'supertest'
import { teamOne } from '../../../fixtures/data'
import { getInitialTeamData } from '../../../../src/utils/team-stats'
import app from '../../../../src/app'
import { Types } from 'mongoose'

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
        await Team.create({ ...teamOne, ...getInitialTeamData({ goalsFor: 1, goalsAgainst: 1, wins: 1 }) })
        const response = await request(app).get(`/api/v1/stats/team/${teamOne._id}`).expect(200)
        const { team } = response.body
        expect(team).toMatchObject({
            _id: teamOne._id.toHexString(),
            name: teamOne.name,
            ...getInitialTeamData({ goalsFor: 1, goalsAgainst: 1, wins: 1 }),
        })
    })

    it('with unfound team', async () => {
        const response = await request(app).get(`/api/v1/stats/team/${new Types.ObjectId()}`).expect(404)
        expect(response.body.message).toBe(Constants.TEAM_NOT_FOUND)
    })
})
