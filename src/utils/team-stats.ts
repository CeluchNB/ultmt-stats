import { Types } from 'mongoose'
import { Action, ActionType, IngestedPoint } from '../types/point'
import { TeamData } from '../types/team'
import {
    isCompletion,
    isCurrentTeamScore,
    isCurrentTeamTurnover,
    isNotDiscMovementAction,
    isOpposingTeamTurnover,
} from './action'
import { isCallahan } from './action'
import { MomentumPoint } from '../types/game'
import { removeElementsFromArray, idEquals, safeFraction } from './utils'

export const calculateTeamData = (
    inputPoint: IngestedPoint,
    teamNumber: 'one' | 'two',
    teamId?: Types.ObjectId,
): TeamData => {
    const teamData = getInitialTeamData({})

    const actions = teamNumber === 'one' ? inputPoint.teamOneActions : inputPoint.teamTwoActions
    updateTeamDataForPoint(actions, teamData, teamNumber)
    updateTeamPointData(inputPoint, teamData, teamId)

    return teamData
}

export const updateTeamDataForPoint = (actions: Action[], teamData: TeamData, teamNumber: 'one' | 'two') => {
    let prevAction: Action | undefined = undefined
    let possessionCounter = 0
    for (const action of actions.sort((a, b) => a.actionNumber - b.actionNumber)) {
        updateTeamDataByAction(teamData, action, teamNumber, prevAction)
        if (isNotDiscMovementAction(action)) {
            prevAction = action
        }
        if (isCurrentTeamTurnover(action)) {
            teamData.completionsToTurnover.push(possessionCounter)
            possessionCounter = 0
        } else if (isCurrentTeamScore(action, teamNumber)) {
            possessionCounter += 1
            teamData.completionsToScore.push(possessionCounter)
            possessionCounter = 0
        } else if (isCompletion(action)) {
            possessionCounter += 1
        }
    }
}

export const updateTeamPointData = (inputPoint: IngestedPoint, teamData: TeamData, teamId?: Types.ObjectId) => {
    if (isDefensivePoint(inputPoint, teamId)) {
        teamData.defensePoints = 1
        if (teamData.goalsFor === 1) {
            teamData.breaks = 1
        }
    } else if (isOffensivePoint(inputPoint, teamId)) {
        teamData.offensePoints = 1
        if (teamData.goalsFor === 1) {
            teamData.holds = 1
            if (teamData.turnovers === 0) {
                teamData.turnoverFreeHolds = 1
            }
        }
    }
}

export const updateTeamDataByAction = (
    team: TeamData,
    action: Action,
    teamNumber: 'one' | 'two',
    prevAction?: Action,
) => {
    // turnover forced could be pickup, block -> pickup
    switch (action.actionType) {
        case ActionType.DROP:
        case ActionType.THROWAWAY:
            team.turnovers += 1
            break
        case ActionType.BLOCK:
            team.turnoversForced += 1
            break
        case ActionType.TEAM_ONE_SCORE:
            if (teamNumber === 'one') {
                team.goalsFor += 1
                if (isCallahan(action, prevAction)) {
                    team.turnoversForced += 1
                }
            } else {
                team.goalsAgainst += 1
            }
            break
        case ActionType.TEAM_TWO_SCORE:
            if (teamNumber === 'two') {
                team.goalsFor += 1
                if (isCallahan(action, prevAction)) {
                    team.turnoversForced += 1
                }
            } else {
                team.goalsAgainst += 1
            }
            break
        case ActionType.PICKUP:
            if (prevAction && prevAction.actionType !== ActionType.BLOCK) {
                team.turnoversForced += 1
            }
            break
    }
}

export const getInitialTeamData = (overrides: Partial<TeamData>): TeamData => {
    return {
        wins: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        holds: 0,
        breaks: 0,
        turnoverFreeHolds: 0,
        offensePoints: 0,
        defensePoints: 0,
        turnovers: 0,
        turnoversForced: 0,
        completionsToScore: [],
        completionsToTurnover: [],
        ...overrides,
    }
}

export const addTeamData = (data1: TeamData, data2: TeamData): TeamData => {
    return {
        goalsFor: data1.goalsFor + data2.goalsFor,
        goalsAgainst: data1.goalsAgainst + data2.goalsAgainst,
        wins: data1.wins + data2.wins,
        losses: data1.losses + data2.losses,
        holds: data1.holds + data2.holds,
        breaks: data1.breaks + data2.breaks,
        turnoverFreeHolds: data1.turnoverFreeHolds + data2.turnoverFreeHolds,
        turnovers: data1.turnovers + data2.turnovers,
        turnoversForced: data1.turnoversForced + data2.turnoversForced,
        offensePoints: data1.offensePoints + data2.offensePoints,
        defensePoints: data1.defensePoints + data2.defensePoints,
        completionsToScore: [...data1.completionsToScore, ...data2.completionsToScore],
        completionsToTurnover: [...data1.completionsToTurnover, ...data2.completionsToTurnover],
    }
}

export const getIncTeamData = (data: TeamData): Omit<TeamData, 'completionsToScore' | 'completionsToTurnover'> => {
    return {
        goalsFor: data.goalsFor,
        goalsAgainst: data.goalsAgainst,
        wins: data.wins,
        losses: data.losses,
        holds: data.holds,
        breaks: data.breaks,
        turnoverFreeHolds: data.turnoverFreeHolds,
        turnovers: data.turnovers,
        turnoversForced: data.turnoversForced,
        offensePoints: data.offensePoints,
        defensePoints: data.defensePoints,
    }
}

export const getDecTeamData = (data: TeamData): Omit<TeamData, 'completionsToScore' | 'completionsToTurnover'> => {
    return {
        goalsFor: -data.goalsFor,
        goalsAgainst: -data.goalsAgainst,
        wins: -data.wins,
        losses: -data.losses,
        holds: -data.holds,
        breaks: -data.breaks,
        turnoverFreeHolds: -data.turnoverFreeHolds,
        turnovers: -data.turnovers,
        turnoversForced: -data.turnoversForced,
        offensePoints: -data.offensePoints,
        defensePoints: -data.defensePoints,
    }
}

export const getPushTeamData = (data: TeamData) => {
    return {
        completionsToScore: { $each: data.completionsToScore },
        completionsToTurnover: { $each: data.completionsToTurnover },
    }
}

export const getSubtractedTeamValues = (data1: TeamData, data2: TeamData) => {
    const completionsToScore = removeElementsFromArray(data1.completionsToScore, data2.completionsToScore)
    const completionsToTurnover = removeElementsFromArray(data1.completionsToTurnover, data2.completionsToTurnover)
    const decValues = getDecTeamData(data2)

    return { values: decValues, completionsToScore, completionsToTurnover }
}

export const calculateMomentumData = (
    teamOneActions: Action[],
    lastPoint: MomentumPoint,
    pointId: Types.ObjectId,
): MomentumPoint[] => {
    const data: MomentumPoint[] = []
    let xCounter = lastPoint.x
    let yCounter = lastPoint.y
    teamOneActions
        .sort((a, b) => a.actionNumber - b.actionNumber)
        .forEach((action, index) => {
            if (action.actionType === ActionType.TEAM_ONE_SCORE) {
                xCounter += 1
                yCounter += 10
                data.push({ x: xCounter, y: yCounter, pointId })
            } else if (action.actionType === ActionType.TEAM_TWO_SCORE) {
                xCounter += 1
                yCounter -= 10
                data.push({ x: xCounter, y: yCounter, pointId })
            } else if (index > 0) {
                if (isCurrentTeamTurnover(action)) {
                    xCounter += 1
                    yCounter -= 5
                    data.push({ x: xCounter, y: yCounter, pointId })
                } else if (isOpposingTeamTurnover(action, teamOneActions[index - 1])) {
                    xCounter += 1
                    yCounter += 5
                    data.push({ x: xCounter, y: yCounter, pointId })
                }
            }
        })
    return data
}

export const isDefensivePoint = (inputPoint: IngestedPoint, teamId?: Types.ObjectId) => {
    return idEquals(inputPoint.pullingTeam._id, teamId)
}

export const isOffensivePoint = (inputPoint: IngestedPoint, teamId?: Types.ObjectId) => {
    return idEquals(inputPoint.receivingTeam._id, teamId)
}

export const caclculateWinPercentage = (team: TeamData): number => {
    const { wins, losses } = team
    return safeFraction(wins, wins + losses)
}

export const calculateOffensiveConversion = (team: TeamData): number => {
    const { holds, offensePoints } = team
    return safeFraction(holds, offensePoints)
}

export const calculateDefensiveConversion = (team: TeamData): number => {
    const { breaks, defensePoints } = team
    return safeFraction(breaks, defensePoints)
}
