import { IngestedPoint, Action, ActionType } from '../../types/point'
import { Types } from 'mongoose'
import { PlayerData, PlayerDataIndex } from '../../types/player'
import Game from '../../models/game'
import AtomicStat from '../../models/atomic-stat'
import Player from '../../models/player'
import { TeamData } from '../../types/team'
import Team from '../../models/team'
import { isCallahan, PLAYER_ONE_STAT_UPDATES, PLAYER_TWO_STAT_UPDATES } from '../../utils/point'

export const ingestPoint = async (inputPoint: IngestedPoint) => {
    const game = await Game.findById(inputPoint.gameId)
    if (!game) {
        throw new Error()
    }

    const { teamOneId, teamTwoId } = game
    const teamOnePlayerStats = calculatePlayerData(inputPoint, 'one')
    const teamTwoPlayerStats = calculatePlayerData(inputPoint, 'two')

    for (const stats of [...teamOnePlayerStats, ...teamTwoPlayerStats]) {
        stats.pointsPlayed = 1
    }

    for (const stats of teamOnePlayerStats) {
        const statQuery = await AtomicStat.find({ playerId: stats.playerId, gameId: inputPoint.gameId })
        if (statQuery.length === 1) {
            const record = statQuery[0]
            record.set({
                ...addPlayerData(record, stats),
            })
            await record.save()
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

    for (const stats of teamTwoPlayerStats) {
        const statQuery = await AtomicStat.find({ playerId: stats.playerId, gameId: inputPoint.gameId })
        if (statQuery.length === 1) {
            const record = statQuery[0]
            record.set({
                ...addPlayerData(record, stats),
                gameId: inputPoint.gameId,
                teamId: teamTwoId,
            })
            await record.save()
        } else {
            await AtomicStat.create({
                ...stats,
                gameId: inputPoint.gameId,
                teamId: teamTwoId,
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

    const teamOneData = calculateTeamData(teamOneId, inputPoint, 'one')
    const teamTwoData = calculateTeamData(teamTwoId, inputPoint, 'two')

    const teamOneRecord = await Team.findById(teamOneId)
    teamOneRecord?.set({ ...addTeamData(teamOneRecord, teamOneData) })
    await teamOneRecord?.save()

    const teamTwoRecord = await Team.findById(teamTwoId)
    teamTwoRecord?.set({ ...addTeamData(teamTwoRecord, teamTwoData) })
    await teamTwoRecord?.save()

    // TODO: update game data
}

const calculatePlayerData = (
    inputPoint: IngestedPoint,
    teamNumber: 'one' | 'two',
): (PlayerData & { playerId: Types.ObjectId })[] => {
    const atomicStatsMap = new Map<Types.ObjectId, PlayerData>()

    const players = teamNumber === 'one' ? inputPoint.teamOnePlayers : inputPoint.teamTwoPlayers
    for (const player of players) {
        atomicStatsMap.set(player._id, getInitialPlayerData({}))
    }

    let prevAction: Action | undefined = undefined
    const actions = teamNumber === 'one' ? inputPoint.teamOneActions : inputPoint.teamTwoActions
    for (const action of actions.sort((a, b) => a.actionNumber - b.actionNumber)) {
        updateAtomicStats(atomicStatsMap, action, prevAction)
        prevAction = action
    }

    const atomicStats: (PlayerData & { playerId: Types.ObjectId })[] = Array.from(atomicStatsMap).map(
        ([key, value]) => {
            return {
                playerId: key,
                ...value,
            }
        },
    )
    return atomicStats
}

const calculateTeamData = (teamId: Types.ObjectId, inputPoint: IngestedPoint, teamNumber: 'one' | 'two'): TeamData => {
    const teamData = getInitialTeamData({})

    const actions = teamNumber === 'one' ? inputPoint.teamOneActions : inputPoint.teamTwoActions
    let prevAction: Action | undefined = undefined
    for (const action of actions.sort((a, b) => a.actionNumber - b.actionNumber)) {
        updateTeamData(teamData, action, teamNumber, prevAction)
        prevAction = action
    }

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

    return teamData
}

const updateTeamData = (team: TeamData, action: Action, teamNumber: 'one' | 'two', prevAction?: Action) => {
    // TODO: handle data requiring previous action (e.g. turnovers forced)
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
            } else {
                team.goalsAgainst += 1
            }
            break
        case ActionType.TEAM_TWO_SCORE:
            if (teamNumber === 'two') {
                team.goalsFor += 1
            } else {
                team.goalsAgainst += 1
            }
            break
        case ActionType.PICKUP:
            if (prevAction?.actionType !== ActionType.BLOCK) {
                team.turnoversForced += 1
            }
            break
        case ActionType.CATCH:
            if (
                prevAction &&
                prevAction?.actionType !== ActionType.CATCH &&
                prevAction?.actionType !== ActionType.PICKUP
            ) {
                team.turnoversForced += 1
            }
            break
    }
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
    const currentValue = map.get(id) || getInitialPlayerData({})

    for (const value of values) {
        currentValue[value] += 1
    }

    map.set(id, currentValue)
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
        droppedPasses: data1.droppedPasses + data2.droppedPasses,
        pointsPlayed: data1.pointsPlayed + data2.pointsPlayed,
        pulls: data1.pulls + data2.pulls,
        wins: data1.wins + data2.wins,
        losses: data1.losses + data2.losses,
    }
}

const addTeamData = (data1: TeamData, data2: TeamData): TeamData => {
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
