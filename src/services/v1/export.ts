import * as Constants from '../../utils/constants'
import AtomicPlayer from '../../models/atomic-player'
import AtomicTeam from '../../models/atomic-team'
import Game from '../../models/game'
import { ApiError } from '../../types/error'
import sgMail from '@sendgrid/mail'
import { getGame, getUser } from '../../utils/services'
import {
    addTeamData,
    calculateDefensiveConversion,
    calculateOffensiveConversion,
    getInitialTeamData,
} from '../../utils/team-stats'
import { IAtomicPlayer, IAtomicTeam } from '../../types/atomic-stat'
import {
    addPlayerData,
    calculateCatchingPercentage,
    calculateDefensiveEfficiency,
    calculateOffensiveEfficiency,
    calculatePpAssists,
    calculatePpBlocks,
    calculatePpDrops,
    calculatePpGoals,
    calculatePpHockeyAssists,
    calculatePpThrowaways,
    calculateThrowingPercentage,
} from '../../utils/player-stats'
import { calculatePlayerPlusMinus } from '../../utils/game-stats'
import { idEquals } from '../../utils/utils'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const xl = require('excel4node')

/**
 * Method to retrieve team stats as an Excel file
 * @param managerId manager for team
 * @param teamId team for stats
 */
export const exportTeamStats = async (userId: string, teamId: string) => {
    // get user from user service
    const userResponse = await getUser(userId)
    const user = userResponse.data
    if (!user) {
        throw new ApiError(Constants.PLAYER_NOT_FOUND, 404)
    }

    const atomicTeams = await AtomicTeam.find({ teamId })
    if (atomicTeams.length === 0) {
        throw new ApiError(Constants.TEAM_NOT_FOUND, 404)
    }

    const games = await Game.find({ _id: atomicTeams.map((t) => t.gameId) })

    // build excel doc
    const workbook = new xl.Workbook()

    // create sheet for aggregated team stats
    await generateTeamSheet(teamId, workbook)

    // create sheet for each game
    for (const game of games) {
        // get game and determine opponent's name
        const gameResponse = await getGame(game._id.toHexString())
        const { game: gameData } = gameResponse.data
        if (!gameData) {
            throw new ApiError(Constants.GAME_NOT_FOUND, 404)
        }

        const name = getSheetName(gameData, teamId)
        await generateGameSheet(game._id.toHexString(), teamId, workbook, name)
    }

    // send email
    const team = atomicTeams[atomicTeams.length - 1]
    const fileName = `${team.place} ${team.name} ${team.seasonStart?.getFullYear() ?? ''}`
    const buffer = await workbook.writeToBuffer()
    sgMail.send({
        to: user.email,
        from: 'developer@theultmtapp.com',
        subject: `${fileName} Export`,
        text: 'This export was requested from The Ultmt App. If you did not request this file, feel free to email developer@theultmtapp.com to prevent further exports.',
        attachments: [
            {
                content: buffer.toString('base64'),
                filename: `${fileName}.xlsx`,
            },
        ],
    })
}

export const exportGameStats = async (userId: string, gameId: string) => {
    // get user from user service
    const userResponse = await getUser(userId)
    const user = userResponse.data
    if (!user) {
        throw new ApiError(Constants.PLAYER_NOT_FOUND, 404)
    }

    // get game from game service
    const gameResponse = await getGame(gameId)
    const { game } = gameResponse.data
    if (!game) {
        throw new ApiError(Constants.GAME_NOT_FOUND, 404)
    }

    // generate worksheet
    const workbook = new xl.Workbook()
    await generateGameSheet(gameId, game.teamOne._id, workbook)
    if (game.teamTwo?._id) {
        await generateGameSheet(gameId, game.teamTwo._id, workbook)
    }

    const date = new Date(game.startTime).toDateString()
    const fileName = `${game.teamOne.name} vs. ${game.teamTwo.name} - ${date}`

    // send email
    const buffer = await workbook.writeToBuffer()
    sgMail.send({
        to: user.email,
        from: 'developer@theultmtapp.com',
        subject: `${fileName} Export`,
        text: 'This export was requested from The Ultmt App. If you did not request this file, feel free to email developer@theultmtapp.com to prevent further exports.',
        attachments: [
            {
                content: buffer.toString('base64'),
                filename: `${fileName}.xlsx`,
            },
        ],
    })
}

const generateGameSheet = async (gameId: string, teamId: string, workbook: any, name?: string) => {
    const team = await AtomicTeam.findOne({ gameId, teamId })
    if (!team) {
        throw new ApiError(Constants.TEAM_NOT_FOUND, 404)
    }

    const players = await AtomicPlayer.find({ gameId, teamId })

    generateSheet(workbook, team, players, name)
}

export const generateTeamSheet = async (teamId: string, workbook: any) => {
    const atomicTeams = await AtomicTeam.find({ teamId })

    const teamData = atomicTeams.reduce<IAtomicTeam>(
        (prev, curr) => ({ ...prev, ...addTeamData(prev, curr.toJSON()) }),
        {
            ...atomicTeams[0].toJSON(),
            ...getInitialTeamData({}),
        },
    )

    const atomicPlayers = await AtomicPlayer.find({ teamId })
    const playerMap = getPlayerStatMaps(atomicPlayers)

    generateSheet(workbook, teamData, Array.from(playerMap.values()))
}

const generateSheet = async (workbook: any, team: IAtomicTeam, players: IAtomicPlayer[], name?: string) => {
    const headerStyle = workbook.createStyle({
        font: {
            bold: true,
        },
    })
    const nameStyle = workbook.createStyle({
        font: {
            italics: true,
        },
    })
    const decimalStyle = workbook.createStyle({
        numberFormat: '#,##0.0000;(#,##0.0000)',
    })

    const ws = workbook.addWorksheet(name ?? team.name)

    ws.cell(2, 2).string('Name').style(headerStyle)
    ws.column(2).setWidth(20)
    ws.cell(2, 3).string('Goals').style(headerStyle)
    ws.cell(2, 4).string('Assists').style(headerStyle)
    ws.cell(2, 5).string('Hockey Assists').style(headerStyle)
    ws.column(5).setWidth(20)
    ws.cell(2, 6).string('Blocks').style(headerStyle)
    ws.cell(2, 7).string('Throwaways').style(headerStyle)
    ws.column(7).setWidth(20)
    ws.cell(2, 8).string('Drops').style(headerStyle)
    ws.cell(2, 9).string('Stalls').style(headerStyle)
    ws.cell(2, 10).string('Touches').style(headerStyle)
    ws.cell(2, 11).string('Catches').style(headerStyle)
    ws.cell(2, 12).string('Completed Passes').style(headerStyle)
    ws.column(12).setWidth(20)
    ws.cell(2, 13).string('Dropped Passes').style(headerStyle)
    ws.column(13).setWidth(20)
    ws.cell(2, 14).string('Callahans').style(headerStyle)
    ws.cell(2, 15).string('Points Played').style(headerStyle)
    ws.column(15).setWidth(18)
    ws.cell(2, 16).string('Pulls').style(headerStyle)
    ws.cell(2, 17).string('Plus / Minus').style(headerStyle)
    ws.column(17).setWidth(16)
    ws.cell(2, 18).string('Catching Percentage').style(headerStyle)
    ws.column(18).setWidth(20)
    ws.cell(2, 19).string('Throwing Percentage').style(headerStyle)
    ws.column(19).setWidth(20)
    ws.cell(2, 20).string('Goals per point').style(headerStyle)
    ws.column(20).setWidth(20)
    ws.cell(2, 21).string('Assists per point').style(headerStyle)
    ws.column(21).setWidth(20)
    ws.cell(2, 22).string('Hockey Assists per point').style(headerStyle)
    ws.column(22).setWidth(20)
    ws.cell(2, 23).string('Throwaways per point').style(headerStyle)
    ws.column(23).setWidth(20)
    ws.cell(2, 24).string('Drops per point').style(headerStyle)
    ws.column(24).setWidth(20)
    ws.cell(2, 25).string('Blocks per point').style(headerStyle)
    ws.column(25).setWidth(20)
    ws.cell(2, 26).string('Defensive Efficiency').style(headerStyle)
    ws.column(26).setWidth(20)
    ws.cell(2, 27).string('Offensive Efficiency').style(headerStyle)
    ws.column(27).setWidth(20)

    for (let i = 1; i <= players.length; i++) {
        const player = players[i - 1]
        ws.cell(i + 2, 2)
            .string(`${player.firstName} ${player.lastName}`)
            .style(nameStyle)
        ws.cell(i + 2, 3).number(player.goals)
        ws.cell(i + 2, 4).number(player.assists)
        ws.cell(i + 2, 5).number(player.hockeyAssists)
        ws.cell(i + 2, 6).number(player.blocks)
        ws.cell(i + 2, 7).number(player.throwaways)
        ws.cell(i + 2, 8).number(player.drops)
        ws.cell(i + 2, 9).number(player.stalls)
        ws.cell(i + 2, 10).number(player.touches)
        ws.cell(i + 2, 11).number(player.catches)
        ws.cell(i + 2, 12).number(player.completedPasses)
        ws.cell(i + 2, 13).number(player.droppedPasses)
        ws.cell(i + 2, 14).number(player.callahans)
        ws.cell(i + 2, 15).number(player.pointsPlayed)
        ws.cell(i + 2, 16).number(player.pulls)
        ws.cell(i + 2, 17).number(calculatePlayerPlusMinus(player))
        ws.cell(i + 2, 18)
            .number(calculateCatchingPercentage(player))
            .style(decimalStyle)
        ws.cell(i + 2, 19)
            .number(calculateThrowingPercentage(player))
            .style(decimalStyle)
        ws.cell(i + 2, 20)
            .number(calculatePpGoals(player))
            .style(decimalStyle)
        ws.cell(i + 2, 21)
            .number(calculatePpAssists(player))
            .style(decimalStyle)
        ws.cell(i + 2, 22)
            .number(calculatePpHockeyAssists(player))
            .style(decimalStyle)
        ws.cell(i + 2, 23)
            .number(calculatePpThrowaways(player))
            .style(decimalStyle)
        ws.cell(i + 2, 24)
            .number(calculatePpDrops(player))
            .style(decimalStyle)
        ws.cell(i + 2, 25)
            .number(calculatePpBlocks(player))
            .style(decimalStyle)
        ws.cell(i + 2, 26)
            .number(calculateDefensiveEfficiency(player))
            .style(decimalStyle)
        ws.cell(i + 2, 27)
            .number(calculateOffensiveEfficiency(player))
            .style(decimalStyle)
    }

    const playerTotalRow = players.length + 3
    const lastPlayerRow = players.length + 2
    ws.cell(playerTotalRow, 2).string('Total').style(nameStyle)
    ws.cell(playerTotalRow, 3).formula(`SUM(C2:C${lastPlayerRow})`)
    ws.cell(playerTotalRow, 4).formula(`SUM(D2:D${lastPlayerRow})`)
    ws.cell(playerTotalRow, 5).formula(`SUM(E2:E${lastPlayerRow})`)
    ws.cell(playerTotalRow, 6).formula(`SUM(F2:F${lastPlayerRow})`)
    ws.cell(playerTotalRow, 7).formula(`SUM(G2:G${lastPlayerRow})`)
    ws.cell(playerTotalRow, 8).formula(`SUM(H2:H${lastPlayerRow})`)
    ws.cell(playerTotalRow, 9).formula(`SUM(I2:I${lastPlayerRow})`)
    ws.cell(playerTotalRow, 10).formula(`SUM(J2:J${lastPlayerRow})`)
    ws.cell(playerTotalRow, 11).formula(`SUM(K2:K${lastPlayerRow})`)
    ws.cell(playerTotalRow, 12).formula(`SUM(L2:L${lastPlayerRow})`)
    ws.cell(playerTotalRow, 13).formula(`SUM(M2:M${lastPlayerRow})`)
    ws.cell(playerTotalRow, 14).formula(`SUM(N2:N${lastPlayerRow})`)
    ws.cell(playerTotalRow, 15).formula(`SUM(O2:O${lastPlayerRow})`)
    ws.cell(playerTotalRow, 16).formula(`SUM(P2:P${lastPlayerRow})`)
    ws.cell(playerTotalRow, 17).formula(`SUM(Q2:Q${lastPlayerRow})`)
    ws.cell(playerTotalRow, 18).formula(`AVERAGE(R2:R${lastPlayerRow})`).style(decimalStyle)
    ws.cell(playerTotalRow, 19).formula(`AVERAGE(S2:S${lastPlayerRow})`).style(decimalStyle)
    ws.cell(playerTotalRow, 20).formula(`AVERAGE(T2:T${lastPlayerRow})`).style(decimalStyle)
    ws.cell(playerTotalRow, 21).formula(`AVERAGE(U2:U${lastPlayerRow})`).style(decimalStyle)
    ws.cell(playerTotalRow, 22).formula(`AVERAGE(V2:V${lastPlayerRow})`).style(decimalStyle)
    ws.cell(playerTotalRow, 23).formula(`AVERAGE(W2:W${lastPlayerRow})`).style(decimalStyle)
    ws.cell(playerTotalRow, 24).formula(`AVERAGE(X2:X${lastPlayerRow})`).style(decimalStyle)
    ws.cell(playerTotalRow, 25).formula(`AVERAGE(Y2:Y${lastPlayerRow})`).style(decimalStyle)
    ws.cell(playerTotalRow, 26).formula(`AVERAGE(Z2:Z${lastPlayerRow})`).style(decimalStyle)
    ws.cell(playerTotalRow, 27).formula(`AVERAGE(AA2:AA${lastPlayerRow})`).style(decimalStyle)

    const teamTotalsHeaderIndex = players.length + 5
    const teamTotalsValueIndex = players.length + 6
    ws.cell(teamTotalsHeaderIndex, 2).string('Goals For').style(headerStyle)
    ws.cell(teamTotalsValueIndex, 2).number(team.goalsFor)
    ws.cell(teamTotalsHeaderIndex, 3).string('Goals Against').style(headerStyle)
    ws.cell(teamTotalsValueIndex, 3).number(team.goalsAgainst)
    ws.cell(teamTotalsHeaderIndex, 4).string('Holds').style(headerStyle)
    ws.cell(teamTotalsValueIndex, 4).number(team.holds)
    ws.cell(teamTotalsHeaderIndex, 5).string('Turnover Free Holds').style(headerStyle)
    ws.cell(teamTotalsValueIndex, 5).number(team.turnoverFreeHolds)
    ws.cell(teamTotalsHeaderIndex, 6).string('Breaks').style(headerStyle)
    ws.cell(teamTotalsValueIndex, 6).number(team.breaks)
    ws.cell(teamTotalsHeaderIndex, 7).string('Offensive Points').style(headerStyle)
    ws.cell(teamTotalsValueIndex, 7).number(team.offensePoints)
    ws.cell(teamTotalsHeaderIndex, 8).string('Defensive Points').style(headerStyle)
    ws.cell(teamTotalsValueIndex, 8).number(team.defensePoints)
    ws.cell(teamTotalsHeaderIndex, 9).string('Offensive Conversion').style(headerStyle)
    ws.cell(teamTotalsValueIndex, 9).number(calculateOffensiveConversion(team))
    ws.cell(teamTotalsHeaderIndex, 10).string('Defensive Conversion').style(headerStyle)
    ws.cell(teamTotalsValueIndex, 10).number(calculateDefensiveConversion(team))
    ws.cell(teamTotalsHeaderIndex, 11).string('Turnovers').style(headerStyle)
    ws.cell(teamTotalsValueIndex, 11).number(team.turnovers)
    ws.cell(teamTotalsHeaderIndex, 12).string('Turnovers Forced').style(headerStyle)
    ws.cell(teamTotalsValueIndex, 12).number(team.turnoversForced)
}

export const getSheetName = (game: any, teamId: string): string => {
    if (idEquals(game.teamOne._id, teamId)) {
        return `vs. ${game.teamTwo?.name}`
    } else {
        return `vs. ${game.teamOne.name}`
    }
}

export const getPlayerStatMaps = (players: IAtomicPlayer[]): Map<string, IAtomicPlayer> => {
    const playerMap = new Map<string, IAtomicPlayer>()
    for (const atomicPlayer of players) {
        const player = playerMap.get(atomicPlayer.playerId.toHexString())
        if (player) {
            playerMap.set(atomicPlayer.playerId.toHexString(), {
                ...player,
                ...addPlayerData(player, atomicPlayer.toJSON()),
            })
        } else {
            playerMap.set(atomicPlayer.playerId.toHexString(), atomicPlayer.toJSON())
        }
    }
    return playerMap
}
