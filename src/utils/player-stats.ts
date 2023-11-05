import { Types } from 'mongoose'
import { CalculatedPlayerData, EmbeddedPlayer, PlayerData, PlayerDataId, PlayerDataKey } from '../types/player'
import { Action, ActionType } from '../types/point'
import { isCallahan, isCurrentTeamScore, isNotDiscMovementAction } from './action'
import { safeFraction } from './utils'
import { IConnection } from '../types/connection'
import { initializeConnectionMap, updateAtomicConnections } from './connection-stats'
import { TeamData } from '../types/team'

export const calculatePlayerData = (
    players: EmbeddedPlayer[],
    actions: Action[],
    teamNumber: 'one' | 'two',
): { players: PlayerDataId[]; connections: IConnection[] } => {
    const atomicPlayersMap = new Map<Types.ObjectId, PlayerData>()
    const atomicConnectionsMap = new Map<string, IConnection>()

    initializePlayerMap(atomicPlayersMap, players)
    initializeConnectionMap(atomicConnectionsMap, players)
    populateAtomicMaps(atomicPlayersMap, atomicConnectionsMap, actions, teamNumber)

    return { players: flattenPlayerMap(atomicPlayersMap), connections: flattenConnectionMap(atomicConnectionsMap) }
}

export const initializePlayerMap = (map: Map<Types.ObjectId, PlayerData>, players: EmbeddedPlayer[]) => {
    for (const player of players) {
        map.set(player._id, getInitialPlayerData({ pointsPlayed: 1 }))
    }
}

export const populateAtomicMaps = (
    playerMap: Map<Types.ObjectId, PlayerData>,
    connectionMap: Map<string, IConnection>,
    actions: Action[],
    teamNumber: 'one' | 'two',
) => {
    let prevAction: Action | undefined = undefined
    const sortedActions = actions.sort((a, b) => a.actionNumber - b.actionNumber)
    for (const action of sortedActions) {
        updateAtomicPlayer(playerMap, teamNumber, action, prevAction)
        updateAtomicConnections(connectionMap, action)
        if (isNotDiscMovementAction(action)) {
            prevAction = action
        }
    }
}

export const flattenPlayerMap = (map: Map<Types.ObjectId, PlayerData>): PlayerDataId[] => {
    const atomicPlayers: PlayerDataId[] = Array.from(map).map(([key, value]) => {
        return {
            playerId: key,
            ...value,
        }
    })
    return atomicPlayers
}

export const flattenConnectionMap = (map: Map<string, IConnection>): IConnection[] => {
    return Array.from(map).map(([, value]) => {
        return value
    })
}

export const updateAtomicPlayer = (
    stats: Map<Types.ObjectId, PlayerData>,
    teamNumber: 'one' | 'two',
    action: Action,
    prevAction?: Action,
) => {
    const playerOneId = action.playerOne?._id
    if (!playerOneId || (actionIsScore(action) && !isCurrentTeamScore(action, teamNumber))) {
        return
    }

    if (Object.keys(PLAYER_ONE_STAT_UPDATES).includes(action.actionType)) {
        incrementMapValue(stats, playerOneId, PLAYER_ONE_STAT_UPDATES[action.actionType])
    }
    if (isCallahan(action, prevAction)) {
        incrementMapValue(stats, playerOneId, ['callahans', 'blocks'])
    }

    if (isCurrentTeamScore(action, teamNumber) && prevAction?.playerTwo?._id) {
        incrementMapValue(stats, prevAction.playerTwo._id, ['hockeyAssists'])
    }

    const playerTwoId = action.playerTwo?._id
    if (playerTwoId && Object.keys(PLAYER_TWO_STAT_UPDATES).includes(action.actionType)) {
        incrementMapValue(stats, playerTwoId, PLAYER_TWO_STAT_UPDATES[action.actionType])
    }
}

const actionIsScore = (action: Action): boolean => {
    return action.actionType === ActionType.TEAM_ONE_SCORE || action.actionType === ActionType.TEAM_TWO_SCORE
}

export const incrementMapValue = (
    map: Map<Types.ObjectId, PlayerData>,
    id: Types.ObjectId,
    values: PlayerDataKey[],
) => {
    if (values.length === 0) return

    const currentValue = map.get(id)
    if (!currentValue) return

    for (const value of values) {
        currentValue[value] += 1
    }

    map.set(id, currentValue)
}

export const updatePlayerStatsByTeamStats = (playerData: PlayerData[], teamData: TeamData) => {
    for (const stats of playerData) {
        stats.offensePoints = teamData.offensePoints
        stats.defensePoints = teamData.defensePoints
        stats.holds = teamData.holds
        stats.breaks = teamData.breaks
    }
}

export const getInitialPlayerData = (overrides: Partial<PlayerData>): PlayerData => {
    return {
        goals: 0,
        assists: 0,
        hockeyAssists: 0,
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
        offensePoints: 0,
        defensePoints: 0,
        holds: 0,
        breaks: 0,
        ...overrides,
    }
}

export const addPlayerData = (data1: PlayerData, data2: PlayerData): PlayerData => {
    return {
        goals: data1.goals + data2.goals,
        assists: data1.assists + data2.assists,
        hockeyAssists: data1.hockeyAssists + data2.hockeyAssists,
        touches: data1.touches + data2.touches,
        catches: data1.catches + data2.catches,
        callahans: data1.callahans + data2.callahans,
        throwaways: data1.throwaways + data2.throwaways,
        blocks: data1.blocks + data2.blocks,
        drops: data1.drops + data2.drops,
        stalls: data1.stalls + data2.stalls,
        completedPasses: data1.completedPasses + data2.completedPasses,
        droppedPasses: data1.droppedPasses + data2.droppedPasses,
        pointsPlayed: data1.pointsPlayed + data2.pointsPlayed,
        pulls: data1.pulls + data2.pulls,
        offensePoints: data1.offensePoints + data2.offensePoints,
        defensePoints: data1.defensePoints + data2.defensePoints,
        holds: data1.holds + data2.holds,
        breaks: data1.breaks + data2.breaks,
        wins: data1.wins + data2.wins,
        losses: data1.losses + data2.losses,
    }
}

export const subtractPlayerData = (data1: PlayerData, data2: PlayerData): PlayerData => {
    return {
        goals: data1.goals - data2.goals,
        assists: data1.assists - data2.assists,
        hockeyAssists: data1.hockeyAssists - data2.hockeyAssists,
        touches: data1.touches - data2.touches,
        catches: data1.catches - data2.catches,
        callahans: data1.callahans - data2.callahans,
        throwaways: data1.throwaways - data2.throwaways,
        blocks: data1.blocks - data2.blocks,
        drops: data1.drops - data2.drops,
        stalls: data1.stalls - data2.stalls,
        completedPasses: data1.completedPasses - data2.completedPasses,
        droppedPasses: data1.droppedPasses - data2.droppedPasses,
        pointsPlayed: data1.pointsPlayed - data2.pointsPlayed,
        pulls: data1.pulls - data2.pulls,
        offensePoints: data1.offensePoints - data2.offensePoints,
        defensePoints: data1.defensePoints - data2.defensePoints,
        holds: data1.holds - data2.holds,
        breaks: data1.breaks - data2.breaks,
        wins: data1.wins - data2.wins,
        losses: data1.losses - data2.losses,
    }
}

export const calculatePlayerStats = (stats: PlayerData): CalculatedPlayerData => {
    const calcStats: CalculatedPlayerData = {
        winPercentage: safeFraction(stats.wins, stats.wins + stats.losses),
        plusMinus: stats.goals + stats.assists + stats.blocks - stats.throwaways - stats.drops,
        catchingPercentage: safeFraction(stats.catches, stats.catches + stats.drops),
        throwingPercentage: safeFraction(
            stats.completedPasses,
            stats.completedPasses + stats.throwaways + stats.droppedPasses,
        ),
        ppGoals: safeFraction(stats.goals, stats.pointsPlayed),
        ppAssists: safeFraction(stats.assists, stats.pointsPlayed),
        ppHockeyAssists: safeFraction(stats.hockeyAssists, stats.pointsPlayed),
        ppThrowaways: safeFraction(stats.throwaways, stats.pointsPlayed),
        ppDrops: safeFraction(stats.drops, stats.pointsPlayed),
        ppBlocks: safeFraction(stats.blocks, stats.pointsPlayed),
        offensiveEfficiency: safeFraction(stats.holds, stats.offensePoints),
        defensiveEfficiency: safeFraction(stats.breaks, stats.defensePoints),
    }

    return { ...stats, ...calcStats }
}

export const getDecPlayerData = (data: PlayerData): PlayerData => {
    return {
        goals: -data.goals,
        assists: -data.assists,
        hockeyAssists: -data.hockeyAssists,
        touches: -data.touches,
        catches: -data.catches,
        callahans: -data.callahans,
        throwaways: -data.throwaways,
        blocks: -data.blocks,
        drops: -data.drops,
        stalls: -data.stalls,
        completedPasses: -data.completedPasses,
        droppedPasses: -data.droppedPasses,
        pointsPlayed: -data.pointsPlayed,
        pulls: -data.pulls,
        offensePoints: -data.offensePoints,
        defensePoints: -data.defensePoints,
        holds: -data.holds,
        breaks: -data.breaks,
        wins: -data.wins,
        losses: -data.losses,
    }
}

export const calculatePlusMinus = (data: PlayerData): number => {
    return data.goals + data.assists + data.blocks - data.throwaways - data.drops
}

export const calculateCatchingPercentage = (data: PlayerData): number => {
    return safeFraction(data.catches, data.catches + data.drops)
}

export const calculateThrowingPercentage = (data: PlayerData): number => {
    return safeFraction(data.completedPasses, data.completedPasses + data.throwaways + data.droppedPasses)
}

export const calculatePpGoals = (data: PlayerData): number => {
    return safeFraction(data.goals, data.pointsPlayed)
}

export const calculatePpAssists = (data: PlayerData): number => {
    return safeFraction(data.assists, data.pointsPlayed)
}

export const calculatePpHockeyAssists = (data: PlayerData): number => {
    return safeFraction(data.hockeyAssists, data.pointsPlayed)
}

export const calculatePpThrowaways = (data: PlayerData): number => {
    return safeFraction(data.throwaways, data.pointsPlayed)
}

export const calculatePpDrops = (data: PlayerData): number => {
    return safeFraction(data.drops, data.pointsPlayed)
}

export const calculatePpBlocks = (data: PlayerData): number => {
    return safeFraction(data.blocks, data.pointsPlayed)
}

export const calculateWinPercentage = (data: PlayerData): number => {
    return safeFraction(data.wins, data.wins + data.losses)
}

export const calculateOffensiveEfficiency = (data: PlayerData): number => {
    return safeFraction(data.holds, data.offensePoints)
}

export const calculateDefensiveEfficiency = (data: PlayerData): number => {
    return safeFraction(data.breaks, data.defensePoints)
}

export const PLAYER_ONE_STAT_UPDATES: { [key in ActionType]: PlayerDataKey[] } = {
    Drop: ['drops'],
    Throwaway: ['throwaways'],
    TeamOneScore: ['goals', 'touches', 'catches'],
    TeamTwoScore: ['goals', 'touches', 'catches'],
    Pull: ['pulls'],
    Catch: ['touches', 'catches'],
    Block: ['blocks'],
    Pickup: ['touches'],
    Stall: ['stalls'],
    Timeout: [],
    Substitution: [],
    CallOnField: [],
}

export const PLAYER_TWO_STAT_UPDATES: { [key in ActionType]: PlayerDataKey[] } = {
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
    Stall: [],
}
