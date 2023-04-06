/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Types } from 'mongoose'
import { Action, ActionType } from '../../../src/types/point'
import { EmbeddedTeam } from '../../../src/types/team'
import { updateTeamPointData, updateTeamData, getInitialTeamData } from '../../../src/utils/team-stats'

const teamOne: EmbeddedTeam = {
    _id: new Types.ObjectId(),
    place: 'Pittsburgh',
    name: 'Temper',
    teamName: 'pghtemper',
    seasonStart: new Date(),
    seasonEnd: new Date(),
}

const teamTwo: EmbeddedTeam = {
    _id: new Types.ObjectId(),
    place: 'DC',
    name: 'Truck Stop',
    teamName: 'dctruck',
    seasonStart: new Date(),
    seasonEnd: new Date(),
}

describe('updateTeamPointStats', () => {
    const point = {
        pointId: new Types.ObjectId(),
        gameId: new Types.ObjectId(),
        pullingTeam: teamOne,
        teamOnePlayers: [],
        teamTwoPlayers: [],
        teamOneActions: [],
        teamTwoActions: [],
        teamOneScore: 0,
        teamTwoScore: 0,
        receivingTeam: teamTwo,
        scoringTeam: teamOne,
    }
    it('with defensive point with no score', () => {
        const data = getInitialTeamData({})
        updateTeamPointData(point, data, teamOne._id!)

        expect(data.defensePoints).toBe(1)
        expect(data.offensePoints).toBe(0)
        expect(data.breaks).toBe(0)
    })

    it('with break', () => {
        const data = getInitialTeamData({ goalsFor: 1 })
        updateTeamPointData(point, data, teamOne._id!)

        expect(data.defensePoints).toBe(1)
        expect(data.offensePoints).toBe(0)
        expect(data.breaks).toBe(1)
    })

    it('with offensive point with no score', () => {
        const data = getInitialTeamData({})
        updateTeamPointData(point, data, teamTwo._id!)

        expect(data.offensePoints).toBe(1)
        expect(data.defensePoints).toBe(0)
        expect(data.holds).toBe(0)
    })

    it('with offensive score with turnovers', () => {
        const data = getInitialTeamData({ goalsFor: 1, turnovers: 1 })
        updateTeamPointData(point, data, teamTwo._id!)

        expect(data.offensePoints).toBe(1)
        expect(data.defensePoints).toBe(0)
        expect(data.holds).toBe(1)
        expect(data.turnoverFreeHolds).toBe(0)
    })

    it('with offensive score with no turnovers', () => {
        const data = getInitialTeamData({ goalsFor: 1 })
        updateTeamPointData(point, data, teamTwo._id!)

        expect(data.offensePoints).toBe(1)
        expect(data.defensePoints).toBe(0)
        expect(data.holds).toBe(1)
        expect(data.turnoverFreeHolds).toBe(1)
    })
})

describe('updateTeamData', () => {
    const action: Action = {
        actionNumber: 1,
        actionType: ActionType.PULL,
        team: teamOne,
    }

    beforeEach(() => {
        action.actionType = ActionType.PULL
        action.team = teamOne
    })

    it('with drop', () => {
        action.actionType = ActionType.DROP
        const data = getInitialTeamData({})

        updateTeamData(data, action, 'one', undefined)
        expect(data).toMatchObject(getInitialTeamData({ turnovers: 1 }))
    })

    it('with throwaway', () => {
        action.actionType = ActionType.THROWAWAY
        const data = getInitialTeamData({})

        updateTeamData(data, action, 'one', undefined)
        expect(data).toMatchObject(getInitialTeamData({ turnovers: 1 }))
    })

    it('with block', () => {
        action.actionType = ActionType.BLOCK
        const data = getInitialTeamData({})

        updateTeamData(data, action, 'one', undefined)
        expect(data).toMatchObject(getInitialTeamData({ turnoversForced: 1 }))
    })

    it('with team one score on team one', () => {
        action.actionType = ActionType.TEAM_ONE_SCORE
        const data = getInitialTeamData({})

        updateTeamData(data, action, 'one', undefined)
        expect(data).toMatchObject(getInitialTeamData({ goalsFor: 1 }))
    })

    it('with team one score on team two', () => {
        action.actionType = ActionType.TEAM_ONE_SCORE
        const data = getInitialTeamData({})

        updateTeamData(data, action, 'two', undefined)
        expect(data).toMatchObject(getInitialTeamData({ goalsAgainst: 1 }))
    })

    it('with team two score on team one', () => {
        action.actionType = ActionType.TEAM_TWO_SCORE
        const data = getInitialTeamData({})

        updateTeamData(data, action, 'one', undefined)
        expect(data).toMatchObject(getInitialTeamData({ goalsAgainst: 1 }))
    })

    it('with team two score on team two', () => {
        action.actionType = ActionType.TEAM_TWO_SCORE
        const data = getInitialTeamData({})

        updateTeamData(data, action, 'two', undefined)
        expect(data).toMatchObject(getInitialTeamData({ goalsFor: 1 }))
    })
})
