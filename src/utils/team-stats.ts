import { Types } from 'mongoose'
import { Action, ActionType, IngestedPoint } from '../types/point'
import { TeamData } from '../types/team'
import { isDiscMovementAction } from './action'
import { isCallahan } from './action'

export const calculateTeamData = (
    teamId: Types.ObjectId,
    inputPoint: IngestedPoint,
    teamNumber: 'one' | 'two',
): TeamData => {
    const teamData = getInitialTeamData({})

    const actions = teamNumber === 'one' ? inputPoint.teamOneActions : inputPoint.teamTwoActions
    updateTeamPlayerData(actions, teamData, teamNumber)
    updateTeamPointData(inputPoint, teamData, teamId)

    return teamData
}

const updateTeamPlayerData = (actions: Action[], teamData: TeamData, teamNumber: 'one' | 'two') => {
    let prevAction: Action | undefined = undefined
    for (const action of actions.sort((a, b) => a.actionNumber - b.actionNumber)) {
        updateTeamData(teamData, action, teamNumber, prevAction)
        if (isDiscMovementAction(action)) {
            prevAction = action
        }
    }
}

export const updateTeamPointData = (inputPoint: IngestedPoint, teamData: TeamData, teamId: Types.ObjectId) => {
    if (inputPoint.pullingTeam._id?.equals(teamId)) {
        teamData.defensePoints = 1
        if (teamData.goalsFor === 1) {
            teamData.breaks = 1
        }
    } else if (inputPoint.receivingTeam._id?.equals(teamId)) {
        teamData.offensePoints = 1
        if (teamData.goalsFor === 1) {
            teamData.holds = 1
            if (teamData.turnovers === 0) {
                teamData.turnoverFreeHolds = 1
            }
        }
    }
}

export const updateTeamData = (team: TeamData, action: Action, teamNumber: 'one' | 'two', prevAction?: Action) => {
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
            // TODO: handle previous action better (roll back until we get a non-timeout, call, or sub)
            if (prevAction?.actionType !== ActionType.BLOCK) {
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
    }
}
