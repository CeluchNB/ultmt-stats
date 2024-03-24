import * as Constants from '../../utils/constants'
import AtomicPlayer from '../../models/atomic-player'
import AtomicTeam from '../../models/atomic-team'
import Game from '../../models/game'
import { ApiError } from '../../types/error'
import axios from 'axios'
import sgMail from '@sendgrid/mail'
import fs from 'fs'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const xl = require('excel4node')

/**
 * Method to retrieve team stats as an Excel file
 * @param managerId manager for team
 * @param teamId team for stats
 */
// export const exportTeamStats = async (managerId: string, teamId: string) => {
//     const games: string[] = []

//     // build excel doc
//     const workbook = new xl.Workbook()

//     for (const gameId of games) {
//         // const { game: gameData } = gameResponse.data
//         const team: any = {}
//         const game: any = {}
//     }

//     workbook.write('Team-Season.xlsx', function (err: any, stats: any) {
//         if (err) {
//             console.error(err)
//         } else {
//             console.log(stats) // Prints out an instance of a node.js fs.Stats object
//         }
//     })
// }

export const exportGameStats = async (userId: string, gameId: string) => {
    // build excel doc
    const workbook = new xl.Workbook()

    const game = await Game.findById(gameId)
    if (!game) {
        throw new ApiError(Constants.GAME_NOT_FOUND, 404)
    }

    const gameResponse = await getGame(gameId)
    const { game: gameData } = gameResponse.data

    const date = new Date(gameData.startTime).toDateString()
    const name = `${gameData.teamOne.name} vs. ${gameData.teamTwo.name} - ${date}`

    await generateGameSheet(gameId, game.teamOneId.toHexString(), workbook)
    if (game.teamTwoId) {
        await generateGameSheet(gameId, game.teamTwoId.toHexString(), workbook)
    }

    console.log('about to write')
    workbook.writeToBuffer().then((buffer: any) => {
        console.log('writing buffer', buffer)
        sgMail.send({
            to: 'noah.celuch@gmail.com',
            from: 'developer@theultmtapp.com',
            subject: 'Excel Sheet',
            text: 'Game statistics',
            attachments: [
                {
                    content: buffer.toString('base64'),
                    filename: `${name}.xlsx`,
                },
            ],
        })
    })
}

const generateGameSheet = async (gameId: string, teamId: string, workbook: any) => {
    const game = await Game.findById(gameId)
    if (!game) {
        throw new ApiError(Constants.GAME_NOT_FOUND, 404)
    }

    const team = await AtomicTeam.findOne({ gameId, teamId })
    if (!team) {
        throw new ApiError(Constants.TEAM_NOT_FOUND, 404)
    }

    const players = await AtomicPlayer.find({ gameId, teamId })

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

    const ws = workbook.addWorksheet(team.name)

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
        ws.cell(i + 2, 17).number(player.plusMinus)
        ws.cell(i + 2, 18)
            .number(player.catchingPercentage)
            .style(decimalStyle)
        ws.cell(i + 2, 19)
            .number(player.throwingPercentage)
            .style(decimalStyle)
        ws.cell(i + 2, 20)
            .number(player.ppGoals)
            .style(decimalStyle)
        ws.cell(i + 2, 21)
            .number(player.ppAssists)
            .style(decimalStyle)
        ws.cell(i + 2, 22)
            .number(player.ppHockeyAssists)
            .style(decimalStyle)
        ws.cell(i + 2, 23)
            .number(player.ppThrowaways)
            .style(decimalStyle)
        ws.cell(i + 2, 24)
            .number(player.ppDrops)
            .style(decimalStyle)
        ws.cell(i + 2, 25)
            .number(player.ppBlocks)
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
    ws.cell(teamTotalsHeaderIndex, 9).string('Turnovers').style(headerStyle)
    ws.cell(teamTotalsValueIndex, 9).number(team.turnovers)
    ws.cell(teamTotalsHeaderIndex, 10).string('Turnovers Forced').style(headerStyle)
    ws.cell(teamTotalsValueIndex, 10).number(team.turnoversForced)
}

const getGame = async (gameId: string) => {
    return await axios.get(`${process.env.API_URL}/api/v1/game/${gameId}`, {
        headers: {
            'X-API-Key': process.env.API_KEY,
        },
    })
}
