import { Types } from 'mongoose'
import { Action, ActionType, IngestedPoint } from '../types/point'
import { TeamData } from '../types/team'
import { isCallahan } from './player-stats'

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
        prevAction = action
    }
}

const updateTeamPointData = (inputPoint: IngestedPoint, teamData: TeamData, teamId: Types.ObjectId) => {
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

const updateTeamData = (team: TeamData, action: Action, teamNumber: 'one' | 'two', prevAction?: Action) => {
    // TODO: handle data requiring previous action (e.g. turnovers forced)
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
            if (prevAction?.actionType !== ActionType.BLOCK) {
                team.turnoversForced += 1
            }
            break
    }
}

const getInitialTeamData = (overrides: Partial<TeamData>): TeamData => {
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
