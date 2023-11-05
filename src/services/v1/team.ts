import * as Constants from '../../utils/constants'
import { ApiError } from '../../types/error'
import { FilteredTeamData, TeamData } from '../../types/team'
import {
    addTeamData,
    caclculateWinPercentage,
    calculateDefensiveConversion,
    calculateOffensiveConversion,
    getInitialTeamData,
} from '../../utils/team-stats'
import AtomicTeam from '../../models/atomic-team'
import AtomicPlayer from '../../models/atomic-player'
import { FilteredGamePlayer, GameData } from '../../types/game'
import Player from '../../models/player'
import { updateGameData } from '../../utils/game-stats'
import { IAtomicPlayer } from '../../types/atomic-stat'
import { addPlayerData, calculatePlayerStats } from '../../utils/player-stats'
import { idEquals } from '../../utils/utils'

export const getTeamById = async (teamId: string): Promise<FilteredTeamData> => {
    const atomicTeams = await AtomicTeam.find({ teamId })
    if (atomicTeams.length === 0) {
        throw new ApiError(Constants.TEAM_NOT_FOUND, 404)
    }

    const team = atomicTeams[atomicTeams.length - 1]
    const games = atomicTeams.map((team) => team.gameId)

    let data: TeamData = getInitialTeamData({})
    atomicTeams.forEach((stat) => {
        data = { ...addTeamData(stat, data) }
    })

    const stats = await AtomicPlayer.find({ teamId })
    const { players, leaders } = await calculatePlayerDataWithLeaders(stats)

    return {
        ...team,
        ...team.toJSON(),
        ...data,
        ...leaders,
        _id: team._id,
        players,
        games,
        winPercentage: caclculateWinPercentage(data),
        defensiveConversion: calculateDefensiveConversion(data),
        offensiveConversion: calculateOffensiveConversion(data),
    }
}

export const filterTeamStats = async (teamId: string, gameIds: string[]): Promise<FilteredTeamData> => {
    const filter = { $and: [{ teamId }, { gameId: { $in: gameIds } }] }
    const atomicTeams = await AtomicTeam.find({ teamId, ...filter })

    if (atomicTeams.length === 0) {
        throw new ApiError(Constants.TEAM_NOT_FOUND, 404)
    }

    const team = atomicTeams[atomicTeams.length - 1]
    let data: TeamData = getInitialTeamData({})

    atomicTeams.forEach((stat) => {
        data = { ...addTeamData(stat, data) }
    })

    const stats = await AtomicPlayer.find({ teamId, gameId: { $in: gameIds } })
    const { players, leaders } = await calculatePlayerDataWithLeaders(stats)
    const games = atomicTeams.map((team) => team.gameId)

    return {
        _id: team.teamId,
        place: team.place,
        name: team.name,
        players,
        winPercentage: caclculateWinPercentage(data),
        offensiveConversion: calculateOffensiveConversion(data),
        defensiveConversion: calculateDefensiveConversion(data),
        games: games,
        ...data,
        ...leaders,
    }
}

const calculatePlayerDataWithLeaders = async (
    stats: IAtomicPlayer[],
): Promise<{ players: FilteredGamePlayer[]; leaders: GameData }> => {
    const leaders: GameData = {
        goalsLeader: { total: 0, player: undefined },
        assistsLeader: { total: 0, player: undefined },
        blocksLeader: { total: 0, player: undefined },
        plusMinusLeader: { total: 0, player: undefined },
        pointsPlayedLeader: { total: 0, player: undefined },
        turnoversLeader: { total: 0, player: undefined },
    }
    const playerRecords = await Player.find({ _id: { $in: stats.map((s) => s.playerId) } })
    const playerMap = new Map<string, FilteredGamePlayer>()
    for (const stat of stats) {
        // calculate leaders for single team
        const playerRecord = playerRecords.find((p) => idEquals(p._id, stat.playerId))

        const playerId = playerRecord?._id?.toHexString()
        const player = playerMap.get(playerId || '')
        if (!playerId || !playerRecord) continue

        // generate player object
        if (player) {
            playerMap.set(playerId, { ...player, ...stat.toJSON(), ...addPlayerData(player, stat) })
        } else {
            playerMap.set(playerId, { ...playerRecord.toJSON(), ...stat.toJSON() })
        }
    }

    const playerArray = Array.from(playerMap).map(([, player]) => player)
    const players: FilteredGamePlayer[] = []
    for (const player of playerArray) {
        updateGameData(leaders, player, player)
        players.push({ ...player, ...calculatePlayerStats(player) })
    }

    return { players, leaders }
}
