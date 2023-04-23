import Team from '../../../../src/models/team'
import * as Constants from '../../../../src/utils/constants'
import { setUpDatabase, tearDownDatabase, resetDatabase } from '../../../fixtures/setup-db'
import { teamOne } from '../../../fixtures/data'
import { getInitialTeamData } from '../../../../src/utils/team-stats'
import { getTeamById } from '../../../../src/services/v1/team'
import { Types } from 'mongoose'
import { ApiError } from '../../../../src/types/error'

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
        await Team.create({ ...teamOne, ...getInitialTeamData({ goalsFor: 1, goalsAgainst: 1, wins: 1 }) })
        const team = await getTeamById(teamOne._id.toHexString())
        expect(team).toMatchObject({ ...teamOne, ...getInitialTeamData({ goalsFor: 1, goalsAgainst: 1, wins: 1 }) })
    })

    it('with missing team', async () => {
        await expect(getTeamById(new Types.ObjectId().toHexString())).rejects.toThrowError(
            new ApiError(Constants.TEAM_NOT_FOUND, 404),
        )
    })
})
