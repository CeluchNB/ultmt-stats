import { IngestedPoint, Action, ActionType } from '../../types/point'
import { GameData, IdentifiedTeamData } from '../../types/game'
import { Types } from 'mongoose'
import { PlayerData } from '../../types/player'
import Game from '../../models/game'
import AtomicStat from '../../models/atomic-stat'
import Player from '../../models/player'

const getInitialTeamData = (overrides: Partial<IdentifiedTeamData>): IdentifiedTeamData => {
    return {
        _id: new Types.ObjectId(),
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
        callahans: 0,
        pointsPlayed: 0,
        pulls: 0,
        wins: 0,
        losses: 0,
        ...overrides,
    }
}

const addPlayerData = (data1: PlayerData, data2: PlayerData): PlayerData => {
    return {
        goals: data1.goals + data2.goals,
        assists: data1.assists + data2.assists,
        touches: data1.touches + data2.touches,
        catches: data1.catches + data2.catches,
        callahans: data1.callahans + data2.callahans,
        throwaways: data1.throwaways + data2.throwaways,
        blocks: data1.blocks + data2.blocks,
        drops: data1.drops + data2.drops,
        stalls: data1.drops + data2.drops,
        completedPasses: data1.completedPasses + data2.completedPasses,
        pointsPlayed: data1.pointsPlayed + data2.pointsPlayed,
        pulls: data1.pulls + data2.pulls,
        wins: data1.wins + data2.wins,
        losses: data1.losses + data2.losses,
    }
}

export const ingestPoint = async (inputPoint: IngestedPoint) => {
    const game = await Game.findById(inputPoint.gameId)
    if (!game) {
        throw new Error()
    }

    const { teamOneId, teamTwoId } = game
    const { atomicStats: teamOneStats } = calculatePointData(inputPoint.teamOneActions, teamOneId)
    const { atomicStats: teamTwoStats } = calculatePointData(inputPoint.teamTwoActions, teamTwoId)

    for (const stats of [...teamOneStats, ...teamTwoStats]) {
        stats.pointsPlayed = 1
    }

    for (const stats of teamOneStats) {
        const statQuery = await AtomicStat.find({ playerId: stats.playerId, gameId: inputPoint.gameId })
        if (statQuery.length === 1) {
            const record = statQuery[0]
            await AtomicStat.create({
                ...addPlayerData(record, stats),
                gameId: inputPoint.gameId,
                teamId: teamOneId,
            })
        } else {
            await AtomicStat.create({
                ...stats,
                gameId: inputPoint.gameId,
                teamId: teamOneId,
            })
        }
        const player = await Player.findById(stats.playerId)
        if (player) {
            player.set({ ...addPlayerData(player, stats) })
            await player.save()
        } else {
            await Player.create({ ...stats })
        }
    }

    // for (const stats of teamTwoStats) {
    //     await AtomicStat.create({
    //         ...stats,
    //         gameId: inputPoint.gameId,
    //         teamId: teamTwo._id,
    //     })
    // }

    // const point: IPoint = {
    //     _id: inputPoint.pointId,
    //     teamOne,
    //     teamTwo,
    //     players: [...teamOneStats, ...teamTwoStats],
    // }

    // // TODO: this method must take previous stats into account
    // const gameData = mediatePointLeaders(teamOnePoint, teamTwoPoint)

    // game.set({ ...gameData })
    // game.points.push(point)
    // await game.save()
}

const calculatePointData = (
    actions: Action[],
    teamId: Types.ObjectId,
): {
    point: Partial<GameData>
    team: IdentifiedTeamData
    atomicStats: (PlayerData & { playerId: Types.ObjectId })[]
} => {
    const point: Partial<GameData> = {}
    const team: IdentifiedTeamData = getInitialTeamData({ _id: teamId })
    const atomicStatsMap = new Map<Types.ObjectId, PlayerData>()

    for (const action of actions) {
        updateAtomicStats(atomicStatsMap, action)
    }

    const atomicStats: (PlayerData & { playerId: Types.ObjectId })[] = Array.from(atomicStatsMap).map(
        ([key, value]) => {
            return {
                playerId: key,
                ...value,
            }
        },
    )
    return { point, team, atomicStats }
}

// const updatePointData = (point: GameData, action: Action) => {
// TODO: handle everything
// }

// const updateTeamData = (team: IdentifiedTeamData, action: Action) => {
//     // TODO: handle everything, going to need previous action to calculate some things
//     switch (action.actionType) {
//         case ActionType.DROP:
//         case ActionType.THROWAWAY:
//             team.turnovers += 1
//             break
//         case ActionType.BLOCK:
//             team.turnoversForced += 1
//             break
//     }
// }

const updateAtomicStats = (stats: Map<Types.ObjectId, Partial<PlayerData>>, action: Action) => {
    const playerOneId = action.playerOne?._id
    if (!playerOneId) {
        return
    }

    if (!stats.get(playerOneId)) {
        stats.set(playerOneId, getInitialPlayerData({}))
    }
    const playerOneData = stats.get(playerOneId)
    const playerTwoId = action.playerTwo?._id
    if (playerTwoId && !stats.get(playerTwoId)) {
        stats.set(playerTwoId, getInitialPlayerData({}))
    }

    switch (action.actionType) {
        case ActionType.DROP:
            stats.set(playerOneId, { ...playerOneData, drops: (playerOneData?.drops || 0) + 1 })
            break
        case ActionType.THROWAWAY:
            stats.set(playerOneId, {
                ...playerOneData,
                throwaways: (playerOneData?.throwaways || 0) + 1,
            })
            break
        case ActionType.TEAM_ONE_SCORE:
        case ActionType.TEAM_TWO_SCORE:
            // TODO: handle callahan
            stats.set(playerOneId, {
                ...playerOneData,
                goals: 1,
                touches: (playerOneData?.touches || 0) + 1,
                catches: (playerOneData?.catches || 0) + 1,
            })
            if (playerTwoId) {
                const playerTwoData = stats.get(playerTwoId)
                stats.set(playerTwoId, {
                    ...playerTwoData,
                    assists: 1,
                    completedPasses: (playerTwoData?.completedPasses || 0) + 1,
                })
            }
            break
        case ActionType.CATCH:
            stats.set(playerOneId, {
                ...playerOneData,
                touches: (playerOneData?.touches || 0) + 1,
                catches: (playerOneData?.catches || 0) + 1,
            })
            if (playerTwoId) {
                const playerTwoData = stats.get(playerTwoId)
                stats.set(playerTwoId, {
                    ...playerTwoData,
                    completedPasses: (playerTwoData?.completedPasses || 0) + 1,
                })
            }
            break
        case ActionType.BLOCK:
            stats.set(playerOneId, {
                ...playerOneData,
                blocks: (playerOneData?.blocks || 0) + 1,
            })
            break
        case ActionType.PICKUP:
            stats.set(playerOneId, {
                ...playerOneData,
                touches: (playerOneData?.touches || 0) + 1,
            })
            break
        case ActionType.PULL:
            stats.set(playerOneId, {
                ...playerOneData,
                pulls: 1,
            })
            break
    }
}

// const mediatePointLeaders = (teamOnePoint: Partial<GameData>, teamTwoPoint: Partial<GameData>): Partial<GameData> => {
//     return {}
// }
