import { IngestedPoint, Action, ActionType } from '../../types/point'
import { GameData, IdentifiedPlayerData, IdentifiedTeamData, IPoint } from '../../types/game'
import { Types } from 'mongoose'
import { PlayerData } from '../../types/player'
import Game from '../../models/game'

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

export const ingestPoint = async (inputPoint: IngestedPoint) => {
    const game = await Game.findById(inputPoint.gameId)
    if (!game) {
        throw new Error()
    }

    const { teamOneId, teamTwoId } = game
    const {
        point: teamOnePoint,
        atomicStats: teamOneStats,
        team: teamOne,
    } = calculatePointData(inputPoint.teamOneActions, teamOneId)
    const {
        point: teamTwoPoint,
        atomicStats: teamTwoStats,
        team: teamTwo,
    } = calculatePointData(inputPoint.teamTwoActions, teamTwoId)

    for (const stats of [...teamOneStats, ...teamTwoStats]) {
        stats.pointsPlayed = 1
    }

    const point: IPoint = {
        _id: inputPoint.pointId,
        teamOne,
        teamTwo,
        players: [...teamOneStats, ...teamTwoStats],
    }

    // TODO: this method must take previous stats into account
    const gameData = mediatePointLeaders(teamOnePoint, teamTwoPoint)

    game.set({ ...gameData })
    game.points.push(point)
    await game.save()
}

const calculatePointData = (
    actions: Action[],
    teamId: Types.ObjectId,
): {
    point: Partial<GameData>
    team: IdentifiedTeamData
    atomicStats: IdentifiedPlayerData[]
} => {
    const point: Partial<GameData> = {}
    const team: IdentifiedTeamData = getInitialTeamData({ _id: teamId })
    const atomicStatsMap = new Map<Types.ObjectId, PlayerData>()

    let prevAction: Action | undefined = undefined
    for (const action of actions) {
        // updatePointData(point, action)
        updateTeamData(team, action)
        updateAtomicStats(atomicStatsMap, action)
        prevAction = action
    }

    const atomicStats: IdentifiedPlayerData[] = Array.from(atomicStatsMap).map(([key, value]) => {
        return {
            _id: key,
            ...value,
        }
    })
    return { point, team, atomicStats }
}

// const updatePointData = (point: GameData, action: Action) => {
// TODO: handle everything
// }

const updateTeamData = (team: IdentifiedTeamData, action: Action) => {
    // TODO: handle everything, going to need previous action to calculate some things
    switch (action.actionType) {
        case ActionType.DROP:
        case ActionType.THROWAWAY:
            team.turnovers += 1
            break
        case ActionType.BLOCK:
            team.turnoversForced += 1
            break
    }
}

const updateAtomicStats = (stats: Map<Types.ObjectId, Partial<PlayerData>>, action: Action) => {
    const playerOneId = action.playerOne?._id
    if (!playerOneId) {
        return
    }

    if (!stats.get(playerOneId)) {
        stats.set(playerOneId, getInitialPlayerData({}))
    }
    const playerOneData = stats.get(playerOneId)
    let playerTwoId = action.playerTwo?._id
    if (playerTwoId) {
        stats.set(playerTwoId, getInitialPlayerData({}))
    } else {
        playerTwoId = new Types.ObjectId()
    }
    const playerTwoData = stats.get(playerTwoId) || {}

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
            })
            stats.set(playerTwoId, {
                ...playerTwoData,
                assists: 1,
            })
            break
        case ActionType.CATCH:
            stats.set(playerOneId, {
                ...playerOneData,
                touches: (playerOneData?.touches || 0) + 1,
                catches: (playerOneData?.catches || 0) + 1,
            })
            stats.set(playerTwoId, {
                ...playerTwoData,
                completedPasses: (playerOneData?.completedPasses || 0) + 1,
            })
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

const mediatePointLeaders = (teamOnePoint: Partial<GameData>, teamTwoPoint: Partial<GameData>): Partial<GameData> => {
    return {}
}
