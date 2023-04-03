import { IngestedPoint } from '../../types/point'
import { Types } from 'mongoose'
import { PlayerData, PlayerDataId } from '../../types/player'
import Game from '../../models/game'
import AtomicStat from '../../models/atomic-stat'
import Player from '../../models/player'
import { TeamData } from '../../types/team'
import Team from '../../models/team'
import { calculatePlayerData } from '../../utils/player-stats'
import { IPoint } from '../../types/game'
import { calculateTeamData } from '../../utils/team-stats'

export const ingestPoint = async (inputPoint: IngestedPoint) => {
    const game = await Game.findById(inputPoint.gameId)
    if (!game) {
        throw new Error()
    }

    const { _id: gameId, teamOneId, teamTwoId } = game
    const teamOnePlayerStats = calculatePlayerData(inputPoint.teamOnePlayers, inputPoint.teamOneActions)
    const teamTwoPlayerStats = calculatePlayerData(inputPoint.teamTwoPlayers, inputPoint.teamTwoActions)

    await savePlayerData(teamOnePlayerStats, gameId, teamOneId)
    await savePlayerData(teamTwoPlayerStats, gameId, teamTwoId)

    const teamOneData = calculateTeamData(teamOneId, inputPoint, 'one')
    const teamTwoData = calculateTeamData(teamTwoId, inputPoint, 'two')

    await saveTeamData(teamOneData, teamOneId)
    await saveTeamData(teamTwoData, teamTwoId)

    const idPlayerData = [...teamOnePlayerStats, ...teamTwoPlayerStats].map((stats) => {
        return { _id: stats.playerId, ...stats }
    })

    const gamePoint: IPoint = {
        _id: new Types.ObjectId(),
        teamOne: { _id: teamOneId, ...teamOneData },
        teamTwo: { _id: teamTwoId, ...teamTwoData },
        players: idPlayerData,
    }
    game.points.push(gamePoint)
    // TODO: update game leaders with atomic stats
    await game.save()
}

const savePlayerData = async (playerStats: PlayerDataId[], gameId: Types.ObjectId, teamId: Types.ObjectId) => {
    for (const stats of playerStats) {
        await saveAtomicStat(stats, gameId, teamId)
        await savePlayerStats(stats)
    }
}

const saveAtomicStat = async (stats: PlayerDataId, gameId: Types.ObjectId, teamId: Types.ObjectId) => {
    const statQuery = await AtomicStat.find({ playerId: stats.playerId, gameId })
    if (statQuery.length === 1) {
        const record = statQuery[0]
        record.set({
            ...addPlayerData(record, stats),
        })
        await record.save()
    } else {
        await AtomicStat.create({
            ...stats,
            gameId,
            teamId,
        })
    }
}

const savePlayerStats = async (stats: PlayerDataId) => {
    const player = await Player.findById(stats.playerId)
    if (player) {
        player.set({ ...addPlayerData(player, stats) })
        await player.save()
    } else {
        await Player.create({ ...stats })
    }
}

const saveTeamData = async (teamData: TeamData, teamId: Types.ObjectId) => {
    const teamRecord = await Team.findById(teamId)
    teamRecord?.set({ ...addTeamData(teamRecord, teamData) })
    await teamRecord?.save()
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
