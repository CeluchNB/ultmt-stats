/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Types } from 'mongoose'
import { Action, ActionType, IngestedPoint } from '../../../src/types/point'
import {
    updateTeamPointData,
    updateTeamDataByAction,
    updateTeamDataForPoint,
    getInitialTeamData,
    calculateTeamData,
    calculateMomentumData,
} from '../../../src/utils/team-stats'
import { teamOne, teamTwo } from '../../fixtures/data'
import { EmbeddedTeam } from '../../../src/types/team'

describe('updateTeamPointData', () => {
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

describe('updateTeamDataByAction', () => {
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

        updateTeamDataByAction(data, action, 'one', undefined)
        expect(data).toMatchObject(getInitialTeamData({ turnovers: 1 }))
    })

    it('with throwaway', () => {
        action.actionType = ActionType.THROWAWAY
        const data = getInitialTeamData({})

        updateTeamDataByAction(data, action, 'one', undefined)
        expect(data).toMatchObject(getInitialTeamData({ turnovers: 1 }))
    })

    it('with block', () => {
        action.actionType = ActionType.BLOCK
        const data = getInitialTeamData({})

        updateTeamDataByAction(data, action, 'one', undefined)
        expect(data).toMatchObject(getInitialTeamData({ turnoversForced: 1 }))
    })

    it('with team one score on team one', () => {
        action.actionType = ActionType.TEAM_ONE_SCORE
        const data = getInitialTeamData({})

        updateTeamDataByAction(data, action, 'one', undefined)
        expect(data).toMatchObject(getInitialTeamData({ goalsFor: 1 }))
    })

    it('with team one score on team two', () => {
        action.actionType = ActionType.TEAM_ONE_SCORE
        const data = getInitialTeamData({})

        updateTeamDataByAction(data, action, 'two', undefined)
        expect(data).toMatchObject(getInitialTeamData({ goalsAgainst: 1 }))
    })

    it('with team one callahan', () => {
        action.actionType = ActionType.TEAM_ONE_SCORE
        const data = getInitialTeamData({})

        const prevAction: Action = {
            actionNumber: 1,
            actionType: ActionType.PULL,
            team: teamOne,
        }

        updateTeamDataByAction(data, action, 'one', prevAction)
        expect(data).toMatchObject(getInitialTeamData({ goalsFor: 1, turnoversForced: 1 }))
    })

    it('with team two score on team one', () => {
        action.actionType = ActionType.TEAM_TWO_SCORE
        const data = getInitialTeamData({})

        updateTeamDataByAction(data, action, 'one', undefined)
        expect(data).toMatchObject(getInitialTeamData({ goalsAgainst: 1 }))
    })

    it('with team two score on team two', () => {
        action.actionType = ActionType.TEAM_TWO_SCORE
        const data = getInitialTeamData({})

        updateTeamDataByAction(data, action, 'two', undefined)
        expect(data).toMatchObject(getInitialTeamData({ goalsFor: 1 }))
    })

    it('with team two callahan', () => {
        action.actionType = ActionType.TEAM_TWO_SCORE
        const data = getInitialTeamData({})

        const prevAction: Action = {
            actionNumber: 1,
            actionType: ActionType.PULL,
            team: teamOne,
        }

        updateTeamDataByAction(data, action, 'two', prevAction)
        expect(data).toMatchObject(getInitialTeamData({ goalsFor: 1, turnoversForced: 1 }))
    })

    it('with pickup before any other actions', () => {
        action.actionType = ActionType.PICKUP
        const data = getInitialTeamData({})

        updateTeamDataByAction(data, action, 'one', undefined)
        expect(data).toMatchObject(getInitialTeamData({ turnoversForced: 0 }))
    })

    it('with pickup after action', () => {
        const prevAction: Action = {
            actionNumber: 1,
            actionType: ActionType.PULL,
            team: teamOne,
        }
        action.actionType = ActionType.PICKUP
        const data = getInitialTeamData({})

        updateTeamDataByAction(data, action, 'one', prevAction)
        expect(data).toMatchObject(getInitialTeamData({ turnoversForced: 1 }))
    })
})

describe('updateTeamDataForPoint', () => {
    it('handles complex action list', () => {
        const actions: Action[] = [
            {
                actionNumber: 1,
                actionType: ActionType.PULL,
                team: teamOne,
            },
            {
                actionNumber: 2,
                actionType: ActionType.TEAM_ONE_SCORE,
                team: teamOne,
            },
        ]

        const data = getInitialTeamData({})
        updateTeamDataForPoint(actions, data, 'one')
        expect(data).toMatchObject(getInitialTeamData({ goalsFor: 1, turnoversForced: 1, completionsToScore: [1] }))
    })

    it('correctly calculates completions counts', () => {
        const actions: Action[] = [
            {
                actionNumber: 1,
                actionType: ActionType.CATCH,
                team: teamOne,
            },
            {
                actionNumber: 2,
                actionType: ActionType.CATCH,
                team: teamOne,
            },
            {
                actionNumber: 3,
                actionType: ActionType.CATCH,
                team: teamOne,
            },
            {
                actionNumber: 4,
                actionType: ActionType.THROWAWAY,
                team: teamOne,
            },
            {
                actionNumber: 5,
                actionType: ActionType.BLOCK,
                team: teamOne,
            },
            {
                actionNumber: 6,
                actionType: ActionType.PICKUP,
                team: teamOne,
            },
            {
                actionNumber: 7,
                actionType: ActionType.CATCH,
                team: teamOne,
            },
            {
                actionNumber: 8,
                actionType: ActionType.CATCH,
                team: teamOne,
            },
            {
                actionNumber: 9,
                actionType: ActionType.THROWAWAY,
                team: teamOne,
            },
            {
                actionNumber: 10,
                actionType: ActionType.BLOCK,
                team: teamOne,
            },
            {
                actionNumber: 11,
                actionType: ActionType.CATCH,
                team: teamOne,
            },
            {
                actionNumber: 12,
                actionType: ActionType.CATCH,
                team: teamOne,
            },
            {
                actionNumber: 13,
                actionType: ActionType.TEAM_ONE_SCORE,
                team: teamOne,
            },
        ]

        const data = getInitialTeamData({})
        updateTeamDataForPoint(actions, data, 'one')
        expect(data).toMatchObject(
            getInitialTeamData({
                goalsFor: 1,
                turnoversForced: 2,
                turnovers: 2,
                completionsToTurnover: [2, 2],
                completionsToScore: [3],
            }),
        )
    })
})

describe('calculateTeamData', () => {
    const inputPoint: IngestedPoint = {
        teamOneActions: [
            {
                actionNumber: 1,
                actionType: ActionType.PULL,
                team: teamOne,
            },
            {
                actionNumber: 2,
                actionType: ActionType.TEAM_ONE_SCORE,
                team: teamOne,
            },
        ],
        teamTwoActions: [],
        pointId: new Types.ObjectId(),
        gameId: new Types.ObjectId(),
        pullingTeam: teamOne,
        receivingTeam: teamTwo,
        teamOnePlayers: [],
        teamTwoPlayers: [],
        scoringTeam: teamOne,
        teamOneScore: 1,
        teamTwoScore: 0,
    }
    it('for team one', () => {
        const data = calculateTeamData(inputPoint, 'one', new Types.ObjectId())
        expect(data).toMatchObject(getInitialTeamData({ goalsFor: 1, turnoversForced: 1, completionsToScore: [1] }))
    })

    it('for team two', () => {
        inputPoint.pullingTeam = teamTwo
        inputPoint.receivingTeam = teamOne
        inputPoint.scoringTeam = teamTwo
        inputPoint.teamTwoActions = [
            {
                actionNumber: 1,
                actionType: ActionType.PULL,
                team: teamTwo,
            },
            {
                actionNumber: 2,
                actionType: ActionType.TEAM_TWO_SCORE,
                team: teamTwo,
            },
        ]

        const data = calculateTeamData(inputPoint, 'two', new Types.ObjectId())
        expect(data).toMatchObject(getInitialTeamData({ goalsFor: 1, turnoversForced: 1, completionsToScore: [1] }))
    })
})

describe('calculateMomentumData', () => {
    it('handles team one score', () => {
        const result = calculateMomentumData(
            [{ actionNumber: 2, actionType: ActionType.TEAM_ONE_SCORE, team: {} as EmbeddedTeam }],
            { x: 0, y: 0 },
        )

        expect(result.length).toBe(1)
        expect(result).toEqual([{ x: 1, y: 10 }])
    })

    it('handles team two score', () => {
        const result = calculateMomentumData(
            [{ actionNumber: 2, actionType: ActionType.TEAM_TWO_SCORE, team: {} as EmbeddedTeam }],
            { x: 0, y: 0 },
        )

        expect(result.length).toBe(1)
        expect(result).toEqual([{ x: 1, y: -10 }])
    })

    it('handles team one turnover', () => {
        const result = calculateMomentumData(
            [
                { actionNumber: 1, actionType: ActionType.CATCH, team: {} as EmbeddedTeam },
                { actionNumber: 2, actionType: ActionType.THROWAWAY, team: {} as EmbeddedTeam },
            ],
            { x: 0, y: 0 },
        )

        expect(result.length).toBe(1)
        expect(result).toEqual([{ x: 1, y: -5 }])
    })

    it('handles team two turnover', () => {
        const result = calculateMomentumData(
            [
                { actionNumber: 1, actionType: ActionType.PULL, team: {} as EmbeddedTeam },
                { actionNumber: 2, actionType: ActionType.BLOCK, team: {} as EmbeddedTeam },
            ],
            { x: 0, y: 0 },
        )

        expect(result.length).toBe(1)
        expect(result).toEqual([{ x: 1, y: 5 }])
    })

    it('handles team one break', () => {
        const result = calculateMomentumData(
            [
                { actionNumber: 1, actionType: ActionType.PULL, team: {} as EmbeddedTeam },
                { actionNumber: 2, actionType: ActionType.BLOCK, team: {} as EmbeddedTeam },
                { actionNumber: 3, actionType: ActionType.CATCH, team: {} as EmbeddedTeam },
                { actionNumber: 4, actionType: ActionType.CATCH, team: {} as EmbeddedTeam },
                { actionNumber: 5, actionType: ActionType.CATCH, team: {} as EmbeddedTeam },
                { actionNumber: 6, actionType: ActionType.TEAM_ONE_SCORE, team: {} as EmbeddedTeam },
            ],
            { x: 0, y: 0 },
        )
        expect(result.length).toBe(2)
        expect(result).toEqual([
            { x: 1, y: 5 },
            { x: 2, y: 15 },
        ])
    })

    it('handles team two break', () => {
        const result = calculateMomentumData(
            [
                { actionNumber: 1, actionType: ActionType.PICKUP, team: {} as EmbeddedTeam },
                { actionNumber: 2, actionType: ActionType.CATCH, team: {} as EmbeddedTeam },
                { actionNumber: 3, actionType: ActionType.CATCH, team: {} as EmbeddedTeam },
                { actionNumber: 4, actionType: ActionType.THROWAWAY, team: {} as EmbeddedTeam },
                { actionNumber: 5, actionType: ActionType.PICKUP, team: {} as EmbeddedTeam },
                { actionNumber: 6, actionType: ActionType.CATCH, team: {} as EmbeddedTeam },
                { actionNumber: 6, actionType: ActionType.DROP, team: {} as EmbeddedTeam },
                { actionNumber: 6, actionType: ActionType.TEAM_TWO_SCORE, team: {} as EmbeddedTeam },
            ],
            { x: 0, y: 0 },
        )
        expect(result.length).toBe(4)
        expect(result).toEqual([
            { x: 1, y: -5 },
            { x: 2, y: 0 },
            { x: 3, y: -5 },
            { x: 4, y: -15 },
        ])
    })
})
