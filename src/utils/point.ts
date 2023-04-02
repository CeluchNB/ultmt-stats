import { PlayerDataIndex } from '../types/player'
import { Action, ActionType } from '../types/point'

export const PLAYER_ONE_STAT_UPDATES: { [key in ActionType]: PlayerDataIndex[] } = {
    Drop: ['drops'],
    Throwaway: ['throwaways'],
    TeamOneScore: ['goals', 'touches', 'catches'],
    TeamTwoScore: ['goals', 'touches', 'catches'],
    Pull: ['pulls'],
    Catch: ['touches', 'catches'],
    Block: ['blocks'],
    Pickup: ['touches'],
    Timeout: [],
    Substitution: [],
    CallOnField: [],
}

export const PLAYER_TWO_STAT_UPDATES: { [key in ActionType]: PlayerDataIndex[] } = {
    Catch: ['completedPasses'],
    Drop: ['droppedPasses'],
    TeamOneScore: ['assists', 'completedPasses'],
    TeamTwoScore: ['assists', 'completedPasses'],
    Pull: [],
    Throwaway: [],
    Block: [],
    Pickup: [],
    Timeout: [],
    Substitution: [],
    CallOnField: [],
}

export const isCallahan = (action: Action, prevAction?: Action): boolean => {
    return (
        ([ActionType.TEAM_ONE_SCORE, ActionType.TEAM_TWO_SCORE].includes(action.actionType) &&
            prevAction &&
            [ActionType.PULL, ActionType.DROP, ActionType.THROWAWAY].includes(prevAction.actionType)) ||
        false
    )
}
