import { Types } from 'mongoose'
import { EmbeddedPlayer, PlayerData, PlayerDataId, PlayerDataIndex } from '../types/player'
import { Action, ActionType } from '../types/point'

export const calculatePlayerData = (players: EmbeddedPlayer[], actions: Action[]): PlayerDataId[] => {
    const atomicStatsMap = new Map<Types.ObjectId, PlayerData>()

    initializePlayerMap(atomicStatsMap, players)

    populatePlayerMap(atomicStatsMap, actions)

    return flattenPlayerMap(atomicStatsMap)
}

const initializePlayerMap = (map: Map<Types.ObjectId, PlayerData>, players: EmbeddedPlayer[]) => {
    for (const player of players) {
        map.set(player._id, getInitialPlayerData({ pointsPlayed: 1 }))
    }
}

const populatePlayerMap = (map: Map<Types.ObjectId, PlayerData>, actions: Action[]) => {
    let prevAction: Action | undefined = undefined
    for (const action of actions.sort((a, b) => a.actionNumber - b.actionNumber)) {
        updateAtomicStats(map, action, prevAction)
        prevAction = action
    }
}

const flattenPlayerMap = (map: Map<Types.ObjectId, PlayerData>): PlayerDataId[] => {
    const atomicStats: PlayerDataId[] = Array.from(map).map(([key, value]) => {
        return {
            playerId: key,
            ...value,
        }
    })
    return atomicStats
}

const updateAtomicStats = (stats: Map<Types.ObjectId, PlayerData>, action: Action, prevAction?: Action) => {
    const playerOneId = action.playerOne?._id
    if (!playerOneId) {
        return
    }

    incrementMapValue(stats, playerOneId, PLAYER_ONE_STAT_UPDATES[action.actionType])
    if (isCallahan(action, prevAction)) {
        incrementMapValue(stats, playerOneId, ['callahans', 'blocks'])
    }

    const playerTwoId = action.playerTwo?._id
    if (playerTwoId) {
        incrementMapValue(stats, playerTwoId, PLAYER_TWO_STAT_UPDATES[action.actionType])
    }
}

const incrementMapValue = (map: Map<Types.ObjectId, PlayerData>, id: Types.ObjectId, values: PlayerDataIndex[]) => {
    if (values.length === 0) return

    const currentValue = map.get(id)
    if (!currentValue) return

    for (const value of values) {
        currentValue[value] += 1
    }

    map.set(id, currentValue)
}

export const isCallahan = (action: Action, prevAction?: Action): boolean => {
    return (
        ([ActionType.TEAM_ONE_SCORE, ActionType.TEAM_TWO_SCORE].includes(action.actionType) &&
            prevAction &&
            [ActionType.PULL, ActionType.DROP, ActionType.THROWAWAY].includes(prevAction.actionType)) ||
        false
    )
}

const getInitialPlayerData = (overrides: Partial<PlayerData>): PlayerData => {
    return {
        goals: 0,
        assists: 0,
        blocks: 0,
        throwaways: 0,
        drops: 0,
        stalls: 0,
        touches: 0,
        catches: 0,
        completedPasses: 0,
        droppedPasses: 0,
        callahans: 0,
        pointsPlayed: 0,
        pulls: 0,
        wins: 0,
        losses: 0,
        ...overrides,
    }
}

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
