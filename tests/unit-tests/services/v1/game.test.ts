/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as Constants from '../../../../src/utils/constants'
import {
    createGame,
    finishGame,
    filterGameStats,
    getGameById,
    rebuildAtomicPlayers,
    deleteGame,
} from '../../../../src/services/v1/game'
import { resetDatabase, setUpDatabase, tearDownDatabase } from '../../../fixtures/setup-db'
import { Types } from 'mongoose'
import Game from '../../../../src/models/game'
import AtomicPlayer from '../../../../src/models/atomic-player'
import { getPlayer } from '../../../fixtures/data'
import { EmbeddedTeam, TeamData } from '../../../../src/types/team'
import { getInitialPlayerData } from '../../../../src/utils/player-stats'
import { getInitialTeamData } from '../../../../src/utils/team-stats'
import { IdentifiedPlayerData, IPoint } from '../../../../src/types/game'
import { ApiError } from '../../../../src/types/error'
import AtomicTeam from '../../../../src/models/atomic-team'
import { PlayerData } from '../../../../src/types/player'
import { IConnection } from '../../../../src/types/connection'
import { getInitialConnectionData } from '../../../../src/utils/connection-stats'
import AtomicConnection from '../../../../src/models/atomic-connection'

beforeAll(async () => {
    await setUpDatabase()
})

afterEach(async () => {
    await resetDatabase()
})

afterAll(async () => {
    await tearDownDatabase()
})

const teamOne: EmbeddedTeam = {
    _id: new Types.ObjectId(),
    place: 'Place 1',
    name: 'Name 1',
    teamname: 'placename1',
}
const teamTwo: EmbeddedTeam = {
    _id: new Types.ObjectId(),
    place: 'Place 1',
    name: 'Name 1',
    teamname: 'placename1',
}

describe('create game', () => {
    const _id = new Types.ObjectId()
    const startTime = new Date()
    const playerOne = getPlayer(1)
    const playerTwo = getPlayer(2)

    it('with simple data', async () => {
        await createGame({
            _id: _id.toHexString(),
            startTime,
            teamOne,
            teamTwo: {},
            teamOnePlayers: [],
            teamTwoPlayers: [],
        })

        const game = await Game.findById(_id)
        expect(game?.teamOneId.toString()).toEqual(teamOne._id!.toString())
        expect(game?.points.length).toBe(0)

        const players = await AtomicPlayer.find({})
        expect(players.length).toBe(0)

        const atomicTeams = await AtomicTeam.find({})
        expect(atomicTeams.length).toBe(1)
        expect(atomicTeams[0].teamId.toHexString()).toBe(teamOne._id!.toHexString())
        expect(atomicTeams[0].gameId.toHexString()).toBe(game?._id.toHexString())
    })

    it('with team two and players', async () => {
        await createGame({
            _id: _id.toHexString(),
            startTime,
            teamOne,
            teamTwo,
            teamOnePlayers: [playerOne],
            teamTwoPlayers: [playerTwo],
        })
        const game = await Game.findById(_id)
        expect(game?.teamOneId.toString()).toEqual(teamOne._id!.toString())
        expect(game?.points.length).toBe(0)

        const atomicPlayers = await AtomicPlayer.find({})
        expect(atomicPlayers.length).toBe(2)
        expect(atomicPlayers[0].playerId.toHexString()).toBe(playerOne._id.toHexString())
        expect(atomicPlayers[0].firstName).toBe(playerOne.firstName)
        expect(atomicPlayers[0].lastName).toBe(playerOne.lastName)
        expect(atomicPlayers[0].username).toBe(playerOne.username)
        expect(atomicPlayers[1].playerId.toHexString()).toBe(playerTwo._id.toHexString())
        expect(atomicPlayers[1].firstName).toBe(playerTwo.firstName)
        expect(atomicPlayers[1].lastName).toBe(playerTwo.lastName)
        expect(atomicPlayers[1].username).toBe(playerTwo.username)

        const atomicTeams = await AtomicTeam.find({})
        expect(atomicTeams.length).toBe(2)
        expect(atomicTeams[0].teamId.toHexString()).toBe(teamOne._id!.toHexString())
        expect(atomicTeams[0].gameId.toHexString()).toBe(game?._id.toHexString())
        expect(atomicTeams[0].players[0].toHexString()).toBe(playerOne._id.toHexString())
        expect(atomicTeams[0].teamname).toBe(teamOne.teamname)
        expect(atomicTeams[1].teamId.toHexString()).toBe(teamTwo._id!.toHexString())
        expect(atomicTeams[1].gameId.toHexString()).toBe(game?._id.toHexString())
        expect(atomicTeams[1].players[0].toHexString()).toBe(playerTwo._id.toHexString())
        expect(atomicTeams[1].teamname).toBe(teamTwo.teamname)
    })

    it('with team two players but no team two', async () => {
        await createGame({
            _id: _id.toHexString(),
            startTime,
            teamOne,
            teamTwo: {},
            teamOnePlayers: [playerOne],
            teamTwoPlayers: [playerTwo],
        })

        const game = await Game.findById(_id)
        expect(game?.teamOneId.toString()).toEqual(teamOne._id!.toString())

        const stats = await AtomicPlayer.find({})
        expect(stats.length).toBe(1)

        const atomicTeams = await AtomicTeam.find({})
        expect(atomicTeams.length).toBe(1)
    })

    it('with previously existing game', async () => {
        await Game.create({
            _id,
            startTime: new Date(),
            teamOneId: new Types.ObjectId(),
            teamTwoId: new Types.ObjectId(),
        })

        await expect(
            createGame({
                _id: _id.toHexString(),
                startTime,
                teamOne,
                teamTwo: {},
                teamOnePlayers: [],
                teamTwoPlayers: [],
            }),
        ).rejects.toThrowError()

        const games = await Game.find({})
        expect(games.length).toBe(1)

        const teams = await AtomicTeam.find({})
        expect(teams.length).toBe(0)
    })
})

describe('finish game', () => {
    const gameId = new Types.ObjectId()
    const playerOne = getPlayer(1)
    const playerTwo = getPlayer(2)
    const playerThree = getPlayer(3)
    const playerFour = getPlayer(4)

    beforeEach(async () => {
        await AtomicTeam.create({ ...teamOne, gameId, teamId: teamOne._id, players: [playerOne._id, playerTwo._id] })
        await AtomicTeam.create({ ...teamTwo, gameId, teamId: teamTwo._id, players: [playerThree._id, playerFour._id] })

        await Game.create({
            _id: gameId,
            startTime: new Date(),
            teamOneId: teamOne._id,
            teamTwoId: teamTwo?._id,
        })

        await AtomicPlayer.create({ ...playerOne, playerId: playerOne._id, gameId, teamId: teamOne._id })
        await AtomicPlayer.create({ ...playerTwo, playerId: playerTwo._id, gameId, teamId: teamOne._id })
        await AtomicPlayer.create({ ...playerThree, playerId: playerThree._id, gameId, teamId: teamTwo._id })
        await AtomicPlayer.create({ ...playerFour, playerId: playerFour._id, gameId, teamId: teamTwo._id })
    })

    const getIdPlayers = (): IdentifiedPlayerData[] => {
        const idPlayerOne = { _id: playerOne._id, ...getInitialPlayerData({}) }
        const idPlayerTwo = { _id: playerTwo._id, ...getInitialPlayerData({}) }
        const idPlayerThree = { _id: playerThree._id, ...getInitialPlayerData({}) }
        const idPlayerFour = { _id: playerFour._id, ...getInitialPlayerData({}) }
        return [idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour]
    }

    const createPoint = (
        players: IdentifiedPlayerData[],
        teamOneOverrides: Partial<TeamData>,
        teamTwoOverrides: Partial<TeamData>,
    ): IPoint => {
        return {
            _id: new Types.ObjectId(),
            players,
            teamOne: { _id: teamOne._id, ...getInitialTeamData(teamOneOverrides) },
            teamTwo: { _id: teamTwo._id, ...getInitialTeamData(teamTwoOverrides) },
            connections: [],
        }
    }

    it('with team one winning', async () => {
        const game = await Game.findOne({})
        const [idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour] = getIdPlayers()

        const points = [
            createPoint([idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour], { goalsFor: 1 }, {}),
            createPoint([idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour], { goalsFor: 1 }, {}),
        ]
        game?.points.push(...points)
        await game?.save()

        await finishGame(gameId.toHexString())

        const atomicTeamOneRecord = await AtomicTeam.findOne({ teamId: teamOne._id, gameId })
        expect(atomicTeamOneRecord).toMatchObject({ wins: 1, losses: 0 })

        const atomicTeamTwoRecord = await AtomicTeam.findOne({ teamId: teamTwo._id, gameId })
        expect(atomicTeamTwoRecord).toMatchObject({ wins: 0, losses: 1 })

        const apOneRecord = await AtomicPlayer.findOne({ playerId: playerOne._id })
        expect(apOneRecord).toMatchObject({ wins: 1, losses: 0 })

        const apTwoRecord = await AtomicPlayer.findOne({ playerId: playerTwo._id })
        expect(apTwoRecord).toMatchObject({ wins: 1, losses: 0 })

        const apThreeRecord = await AtomicPlayer.findOne({ playerId: playerThree._id })
        expect(apThreeRecord).toMatchObject({ wins: 0, losses: 1 })

        const apFourRecord = await AtomicPlayer.findOne({ playerId: playerFour._id })
        expect(apFourRecord).toMatchObject({ wins: 0, losses: 1 })
    })

    it('with team one re-winning', async () => {
        const game = await Game.findOne({})
        const atomicTeamOneModify = await AtomicTeam.findOne({ teamId: teamOne._id, gameId })
        atomicTeamOneModify!.wins = 1

        const atomicTeamTwoModify = await AtomicTeam.findOne({ teamId: teamTwo._id, gameId })
        atomicTeamTwoModify!.losses = 1

        const apPlayerOneModify = await AtomicPlayer.findOne({ playerId: playerOne._id })
        apPlayerOneModify!.wins = 1
        await apPlayerOneModify?.save()

        const apPlayerTwoModify = await AtomicPlayer.findOne({ playerId: playerTwo._id })
        apPlayerTwoModify!.wins = 1
        await apPlayerTwoModify?.save()

        const apPlayerThreeModify = await AtomicPlayer.findOne({ playerId: playerThree._id })
        apPlayerThreeModify!.losses = 1
        await apPlayerThreeModify?.save()

        const apPlayerFourModify = await AtomicPlayer.findOne({ playerId: playerFour._id })
        apPlayerFourModify!.losses = 1
        await apPlayerFourModify?.save()

        await atomicTeamOneModify?.save()
        await atomicTeamTwoModify?.save()

        const [idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour] = getIdPlayers()

        const points = [
            createPoint([idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour], { goalsFor: 1 }, {}),
            createPoint([idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour], { goalsFor: 1 }, {}),
            createPoint([idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour], { goalsAgainst: 1 }, {}),
        ]
        game?.points.push(...points)
        game!.winningTeam = 'one'
        await game?.save()

        await finishGame(gameId.toHexString())

        const atomicTeamOneRecord = await AtomicTeam.findOne({ teamId: teamOne._id, gameId })
        expect(atomicTeamOneRecord).toMatchObject({ wins: 1, losses: 0 })

        const atomicTeamTwoRecord = await AtomicTeam.findOne({ teamId: teamTwo._id, gameId })
        expect(atomicTeamTwoRecord).toMatchObject({ wins: 0, losses: 1 })

        const apOneRecord = await AtomicPlayer.findOne({ playerId: playerOne._id })
        expect(apOneRecord).toMatchObject({ wins: 1, losses: 0 })

        const apTwoRecord = await AtomicPlayer.findOne({ playerId: playerTwo._id })
        expect(apTwoRecord).toMatchObject({ wins: 1, losses: 0 })

        const apThreeRecord = await AtomicPlayer.findOne({ playerId: playerThree._id })
        expect(apThreeRecord).toMatchObject({ wins: 0, losses: 1 })

        const apFourRecord = await AtomicPlayer.findOne({ playerId: playerFour._id })
        expect(apFourRecord).toMatchObject({ wins: 0, losses: 1 })
    })

    it('with team one winning after team two', async () => {
        const game = await Game.findOne({})
        const atomicTeamOneModify = await AtomicTeam.findOne({ teamId: teamOne._id, gameId })
        atomicTeamOneModify!.losses = 1

        const atomicTeamTwoModify = await AtomicTeam.findOne({ teamId: teamTwo._id, gameId })
        atomicTeamTwoModify!.wins = 1

        const apPlayerOneModify = await AtomicPlayer.findOne({ playerId: playerOne._id })
        apPlayerOneModify!.losses = 1
        await apPlayerOneModify?.save()

        const apPlayerTwoModify = await AtomicPlayer.findOne({ playerId: playerTwo._id })
        apPlayerTwoModify!.losses = 1
        await apPlayerTwoModify?.save()

        const apPlayerThreeModify = await AtomicPlayer.findOne({ playerId: playerThree._id })
        apPlayerThreeModify!.wins = 1
        await apPlayerThreeModify?.save()

        const apPlayerFourModify = await AtomicPlayer.findOne({ playerId: playerFour._id })
        apPlayerFourModify!.wins = 1
        await apPlayerFourModify?.save()

        await atomicTeamOneModify?.save()
        await atomicTeamTwoModify?.save()
        const [idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour] = getIdPlayers()

        const points = [
            createPoint([idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour], { goalsFor: 1 }, {}),
            createPoint([idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour], { goalsFor: 1 }, {}),
        ]
        game?.points.push(...points)
        game!.winningTeam = 'two'
        await game?.save()

        await finishGame(gameId.toHexString())

        const atomicTeamOneRecord = await AtomicTeam.findOne({ teamId: teamOne._id, gameId })
        expect(atomicTeamOneRecord).toMatchObject({ wins: 1, losses: 0 })

        const atomicTeamTwoRecord = await AtomicTeam.findOne({ teamId: teamTwo._id, gameId })
        expect(atomicTeamTwoRecord).toMatchObject({ wins: 0, losses: 1 })

        const apOneRecord = await AtomicPlayer.findOne({ playerId: playerOne._id })
        expect(apOneRecord).toMatchObject({ wins: 1, losses: 0 })

        const apTwoRecord = await AtomicPlayer.findOne({ playerId: playerTwo._id })
        expect(apTwoRecord).toMatchObject({ wins: 1, losses: 0 })

        const apThreeRecord = await AtomicPlayer.findOne({ playerId: playerThree._id })
        expect(apThreeRecord).toMatchObject({ wins: 0, losses: 1 })

        const apFourRecord = await AtomicPlayer.findOne({ playerId: playerFour._id })
        expect(apFourRecord).toMatchObject({ wins: 0, losses: 1 })
    })

    it('with existent team two winning', async () => {
        const game = await Game.findOne({})
        const [idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour] = getIdPlayers()

        const points = [
            createPoint([idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour], { goalsAgainst: 1 }, { goalsFor: 1 }),
            createPoint([idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour], { goalsAgainst: 1 }, { goalsFor: 1 }),
            createPoint([idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour], { goalsFor: 1 }, { goalsAgainst: 1 }),
        ]
        game?.points.push(...points)
        await game?.save()

        await finishGame(gameId.toHexString())

        const atomicTeamOneRecord = await AtomicTeam.findOne({ teamId: teamOne._id, gameId })
        expect(atomicTeamOneRecord).toMatchObject({ wins: 0, losses: 1 })

        const atomicTeamTwoRecord = await AtomicTeam.findOne({ teamId: teamTwo._id, gameId })
        expect(atomicTeamTwoRecord).toMatchObject({ wins: 1, losses: 0 })

        const apOneRecord = await AtomicPlayer.findOne({ playerId: playerOne._id })
        expect(apOneRecord).toMatchObject({ wins: 0, losses: 1 })

        const apTwoRecord = await AtomicPlayer.findOne({ playerId: playerTwo._id })
        expect(apTwoRecord).toMatchObject({ wins: 0, losses: 1 })

        const apThreeRecord = await AtomicPlayer.findOne({ playerId: playerThree._id })
        expect(apThreeRecord).toMatchObject({ wins: 1, losses: 0 })

        const apFourRecord = await AtomicPlayer.findOne({ playerId: playerFour._id })
        expect(apFourRecord).toMatchObject({ wins: 1, losses: 0 })
    })

    it('with team two re-winning', async () => {
        const game = await Game.findOne({})
        const atomicTeamOneModify = await AtomicTeam.findOne({ teamId: teamOne._id, gameId })
        atomicTeamOneModify!.losses = 1

        const atomicTeamTwoModify = await AtomicTeam.findOne({ teamId: teamTwo._id, gameId })
        atomicTeamTwoModify!.wins = 1

        const apPlayerOneModify = await AtomicPlayer.findOne({ playerId: playerOne._id })
        apPlayerOneModify!.losses = 1
        await apPlayerOneModify?.save()
        const apPlayerTwoModify = await AtomicPlayer.findOne({ playerId: playerTwo._id })
        apPlayerTwoModify!.losses = 1
        await apPlayerTwoModify?.save()

        const apPlayerThreeModify = await AtomicPlayer.findOne({ playerId: playerThree._id })
        apPlayerThreeModify!.wins = 1
        await apPlayerThreeModify?.save()
        const apPlayerFourModify = await AtomicPlayer.findOne({ playerId: playerFour._id })
        apPlayerFourModify!.wins = 1
        await apPlayerFourModify?.save()

        await atomicTeamOneModify?.save()
        await atomicTeamTwoModify?.save()
        const [idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour] = getIdPlayers()

        const points = [
            createPoint([idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour], { goalsAgainst: 1 }, { goalsFor: 1 }),
            createPoint([idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour], { goalsAgainst: 1 }, { goalsFor: 1 }),
        ]
        game!.winningTeam = 'two'
        game?.points.push(...points)
        await game?.save()

        await finishGame(gameId.toHexString())

        const atomicTeamOneRecord = await AtomicTeam.findOne({ teamId: teamOne._id, gameId })
        expect(atomicTeamOneRecord).toMatchObject({ wins: 0, losses: 1 })

        const atomicTeamTwoRecord = await AtomicTeam.findOne({ teamId: teamTwo._id, gameId })
        expect(atomicTeamTwoRecord).toMatchObject({ wins: 1, losses: 0 })

        const apOneRecord = await AtomicPlayer.findOne({ playerId: playerOne._id })
        expect(apOneRecord).toMatchObject({ wins: 0, losses: 1 })

        const apTwoRecord = await AtomicPlayer.findOne({ playerId: playerTwo._id })
        expect(apTwoRecord).toMatchObject({ wins: 0, losses: 1 })

        const apThreeRecord = await AtomicPlayer.findOne({ playerId: playerThree._id })
        expect(apThreeRecord).toMatchObject({ wins: 1, losses: 0 })

        const apFourRecord = await AtomicPlayer.findOne({ playerId: playerFour._id })
        expect(apFourRecord).toMatchObject({ wins: 1, losses: 0 })
    })

    it('with team two winning after team one', async () => {
        const game = await Game.findOne({})

        const atomicTeamOneModify = await AtomicTeam.findOne({ teamId: teamOne._id, gameId })
        atomicTeamOneModify!.wins = 1

        const atomicTeamTwoModify = await AtomicTeam.findOne({ teamId: teamTwo._id, gameId })
        atomicTeamTwoModify!.losses = 1

        const apPlayerOneModify = await AtomicPlayer.findOne({ playerId: playerOne._id })
        apPlayerOneModify!.wins = 1
        await apPlayerOneModify?.save()
        const apPlayerTwoModify = await AtomicPlayer.findOne({ playerId: playerTwo._id })
        apPlayerTwoModify!.wins = 1
        await apPlayerTwoModify?.save()

        const apPlayerThreeModify = await AtomicPlayer.findOne({ playerId: playerThree._id })
        apPlayerThreeModify!.losses = 1
        await apPlayerThreeModify?.save()
        const apPlayerFourModify = await AtomicPlayer.findOne({ playerId: playerFour._id })
        apPlayerFourModify!.losses = 1
        await apPlayerFourModify?.save()

        await atomicTeamOneModify?.save()
        await atomicTeamTwoModify?.save()

        const [idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour] = getIdPlayers()

        const points = [
            createPoint([idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour], { goalsAgainst: 1 }, { goalsFor: 1 }),
            createPoint([idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour], { goalsAgainst: 1 }, { goalsFor: 1 }),
        ]
        game!.winningTeam = 'one'
        game?.points.push(...points)
        await game?.save()

        await finishGame(gameId.toHexString())

        const atomicTeamOneRecord = await AtomicTeam.findOne({ teamId: teamOne._id, gameId })
        expect(atomicTeamOneRecord).toMatchObject({ wins: 0, losses: 1 })

        const atomicTeamTwoRecord = await AtomicTeam.findOne({ teamId: teamTwo._id, gameId })
        expect(atomicTeamTwoRecord).toMatchObject({ wins: 1, losses: 0 })

        const apOneRecord = await AtomicPlayer.findOne({ playerId: playerOne._id })
        expect(apOneRecord).toMatchObject({ wins: 0, losses: 1 })

        const apTwoRecord = await AtomicPlayer.findOne({ playerId: playerTwo._id })
        expect(apTwoRecord).toMatchObject({ wins: 0, losses: 1 })

        const apThreeRecord = await AtomicPlayer.findOne({ playerId: playerThree._id })
        expect(apThreeRecord).toMatchObject({ wins: 1, losses: 0 })

        const apFourRecord = await AtomicPlayer.findOne({ playerId: playerFour._id })
        expect(apFourRecord).toMatchObject({ wins: 1, losses: 0 })
    })

    it('with non-existent team two winning', async () => {
        const game = await Game.findOne({})
        const [idPlayerOne, idPlayerTwo] = getIdPlayers()

        const points = [
            createPoint([idPlayerOne, idPlayerTwo], { goalsAgainst: 1 }, { goalsFor: 1 }),
            createPoint([idPlayerOne, idPlayerTwo], { goalsAgainst: 1 }, { goalsFor: 1 }),
        ]
        game?.points.push(...points)
        game!.teamTwoId = undefined
        await game?.save()

        await finishGame(gameId.toHexString())

        const atomicTeamOneRecord = await AtomicTeam.findOne({ teamId: teamOne._id, gameId })
        expect(atomicTeamOneRecord).toMatchObject({ wins: 0, losses: 1 })

        const atomicTeamTwoRecord = await AtomicTeam.findOne({ teamId: teamTwo._id, gameId })
        expect(atomicTeamTwoRecord).toMatchObject({ wins: 0, losses: 0 })

        const apOneRecord = await AtomicPlayer.findOne({ playerId: playerOne._id })
        expect(apOneRecord).toMatchObject({ wins: 0, losses: 1 })

        const apTwoRecord = await AtomicPlayer.findOne({ playerId: playerTwo._id })
        expect(apTwoRecord).toMatchObject({ wins: 0, losses: 1 })

        const apThreeRecord = await AtomicPlayer.findOne({ playerId: playerThree._id })
        expect(apThreeRecord).toMatchObject({ wins: 0, losses: 0 })

        const apFourRecord = await AtomicPlayer.findOne({ playerId: playerFour._id })
        expect(apFourRecord).toMatchObject({ wins: 0, losses: 0 })
    })

    it('with unfound gamd', async () => {
        await expect(finishGame(new Types.ObjectId().toHexString())).rejects.toThrowError(Constants.GAME_NOT_FOUND)
    })
})

describe('delete game', () => {
    const gameId = new Types.ObjectId()
    const playerOne = getPlayer(1)
    const playerTwo = getPlayer(2)
    const playerThree = getPlayer(3)
    const playerFour = getPlayer(4)

    const atomicTeamOneData: TeamData = getInitialTeamData({
        wins: 1,
        goalsFor: 10,
        goalsAgainst: 5,
    })
    const atomicTeamTwoData: TeamData = getInitialTeamData({
        losses: 1,
        goalsAgainst: 10,
        goalsFor: 5,
    })

    const atomicPlayerOneData: PlayerData = getInitialPlayerData({ goals: 5, assists: 4, catches: 10, touches: 10 })
    const atomicPlayerTwoData: PlayerData = getInitialPlayerData({ goals: 0, assists: 2, catches: 5, touches: 5 })
    const atomicPlayerThreeData: PlayerData = getInitialPlayerData({ goals: 5, assists: 4, catches: 10, touches: 10 })
    const atomicPlayerFourData: PlayerData = getInitialPlayerData({ goals: 0, assists: 2, catches: 5, touches: 5 })

    const atomicConnectionOneData: IConnection = getInitialConnectionData(playerOne._id, playerTwo._id, {
        catches: 4,
        drops: 1,
        scores: 2,
    })
    const atomicConnectionTwoData: IConnection = getInitialConnectionData(playerThree._id, playerFour._id, {
        catches: 6,
        drops: 0,
        scores: 1,
    })

    beforeEach(async () => {
        await AtomicTeam.create(
            { ...teamOne, gameId, teamId: teamOne._id, ...atomicTeamOneData },
            { ...teamTwo, gameId, teamId: teamTwo._id, ...atomicTeamTwoData },
        )

        await AtomicPlayer.create(
            { ...playerOne, teamId: teamOne._id, playerId: playerOne._id, gameId, ...atomicPlayerOneData },
            { ...playerTwo, teamId: teamOne._id, playerId: playerTwo._id, gameId, ...atomicPlayerTwoData },
            { ...playerThree, teamId: teamTwo._id, playerId: playerThree._id, gameId, ...atomicPlayerThreeData },
            { ...playerFour, teamId: teamTwo._id, playerId: playerFour._id, gameId, ...atomicPlayerFourData },
        )

        await AtomicConnection.create(
            { ...atomicConnectionOneData, gameId, teamId: teamOne._id },
            { ...atomicConnectionTwoData, gameId, teamId: teamTwo._id },
        )

        await Game.create({
            _id: gameId,
            startTime: new Date(),
            teamOneId: teamOne._id,
            teamTwoId: teamTwo?._id,
        })
    })

    it('deletes data without deleting game', async () => {
        await deleteGame(gameId.toHexString(), teamOne._id!.toString())

        const atomicPlayers = await AtomicPlayer.find()
        const atomicTeams = await AtomicTeam.find()
        const atomicConnections = await AtomicConnection.find()
        const games = await Game.find()

        expect(atomicPlayers.length).toBe(2)
        expect(atomicTeams.length).toBe(1)
        expect(atomicConnections.length).toBe(1)
        expect(games.length).toBe(1)
    })

    it('deletes data with deleting game', async () => {
        await AtomicTeam.deleteMany({ gameId, teamId: teamTwo._id })
        await AtomicPlayer.deleteMany({ gameId, teamId: teamTwo._id })
        await AtomicConnection.deleteMany({ gameId, teamId: teamTwo._id })

        await deleteGame(gameId.toHexString(), teamOne._id!.toHexString())

        const atomicPlayers = await AtomicPlayer.find()
        const atomicTeams = await AtomicTeam.find()
        const atomicConnections = await AtomicConnection.find()
        const games = await Game.find()

        expect(atomicPlayers.length).toBe(0)
        expect(atomicTeams.length).toBe(0)
        expect(atomicConnections.length).toBe(0)
        expect(games.length).toBe(0)
    })

    it('handles unfound game error', async () => {
        await expect(
            deleteGame(new Types.ObjectId().toHexString(), new Types.ObjectId().toHexString()),
        ).rejects.toThrowError(new ApiError(Constants.GAME_NOT_FOUND, 404))
    })
})

describe('get game by id', () => {
    it('with found game', async () => {
        const gameId = new Types.ObjectId()
        await Game.create({
            _id: gameId,
            startTime: new Date(),
            teamOneId: teamOne._id,
            teamTwoId: teamTwo?._id,
        })

        const result = await getGameById(gameId.toHexString())
        expect(result).toMatchObject({
            teamOneId: teamOne._id,
            teamTwoId: teamTwo._id,
            goalsLeader: { total: 0 },
        })
    })

    it('with unfound game', async () => {
        await expect(getGameById(new Types.ObjectId().toHexString())).rejects.toThrowError(
            new ApiError(Constants.GAME_NOT_FOUND, 404),
        )
    })
})

describe('get filtered game stats', () => {
    const gameId = new Types.ObjectId()
    const playerOne = getPlayer(1)
    const playerTwo = getPlayer(2)
    const playerThree = getPlayer(3)

    beforeEach(async () => {
        await AtomicPlayer.create({
            gameId,
            teamId: teamOne._id,
            playerId: playerOne._id,
            ...playerOne,
            _id: new Types.ObjectId(),
            ...getInitialPlayerData({ goals: 1, pointsPlayed: 2 }),
        })
        await AtomicPlayer.create({
            gameId,
            teamId: teamOne._id,
            playerId: playerTwo._id,
            ...playerTwo,
            _id: new Types.ObjectId(),
            ...getInitialPlayerData({ assists: 1, pointsPlayed: 1 }),
        })
        await AtomicPlayer.create({
            gameId,
            teamId: teamTwo._id,
            playerId: playerThree._id,
            ...playerThree,
            _id: new Types.ObjectId(),
            ...getInitialPlayerData({ throwaways: 1, pointsPlayed: 3 }),
        })
        await Game.create({
            _id: gameId,
            startTime: new Date(),
            teamOneId: teamOne._id,
            teamTwoId: teamTwo?._id,
        })
    })

    it('gets team one successfully', async () => {
        const result = await filterGameStats(gameId.toHexString(), teamOne._id!.toHexString())

        expect(result._id.toHexString()).toBe(gameId.toHexString())
        expect(result.goalsLeader).toMatchObject({ total: 1, player: playerOne })
        expect(result.pointsPlayedLeader).toMatchObject({ total: 2, player: playerOne })
        expect(result.assistsLeader).toMatchObject({ total: 1, player: playerTwo })
        expect(result.plusMinusLeader).toMatchObject({ total: 1, player: playerOne })
        expect(result.turnoversLeader).toMatchObject({ total: 0 })

        expect(result.players.length).toBe(2)
        expect(result.players[0]).toMatchObject({
            firstName: playerOne.firstName,
            lastName: playerOne.lastName,
            goals: 1,
            pointsPlayed: 2,
            ppGoals: 0.5,
        })
        expect(result.players[1]).toMatchObject({
            firstName: playerTwo.firstName,
            lastName: playerTwo.lastName,
            assists: 1,
            pointsPlayed: 1,
            ppAssists: 1,
        })
    })

    it('gets team two successfully', async () => {
        const result = await filterGameStats(gameId.toHexString(), teamTwo._id!.toHexString())

        expect(result._id.toHexString()).toBe(gameId.toHexString())
        expect(result.goalsLeader).toMatchObject({ total: 0 })
        expect(result.pointsPlayedLeader).toMatchObject({ total: 3, player: playerThree })
        expect(result.assistsLeader).toMatchObject({ total: 0 })
        expect(result.plusMinusLeader).toMatchObject({ total: -1, player: playerThree })
        expect(result.turnoversLeader).toMatchObject({ total: 1, player: playerThree })

        expect(result.players.length).toBe(1)
        expect(result.players[0]).toMatchObject({
            firstName: playerThree.firstName,
            lastName: playerThree.lastName,
            throwaways: 1,
            pointsPlayed: 3,
        })
    })

    it('with unfound game', async () => {
        await expect(
            filterGameStats(new Types.ObjectId().toHexString(), teamOne._id!.toHexString()),
        ).rejects.toThrowError(new ApiError(Constants.GAME_NOT_FOUND, 404))
    })
})

describe('rebuild atomic players', () => {
    const playerOne = getPlayer(1)
    const playerTwo = getPlayer(2)
    const playerThree = getPlayer(3)
    const gameOneId = new Types.ObjectId()
    const gameTwoId = new Types.ObjectId()

    beforeEach(async () => {
        await Game.create({
            _id: gameOneId,
            startTime: new Date(),
            teamOneId: teamOne._id,
            teamTwoId: teamTwo?._id,
            points: [
                {
                    players: [
                        {
                            _id: playerOne._id,
                            ...getInitialPlayerData({ goals: 1, catches: 1, touches: 1, pointsPlayed: 2 }),
                        },
                        {
                            _id: playerTwo._id,
                            ...getInitialPlayerData({ assists: 1, completedPasses: 1, touches: 1, pointsPlayed: 1 }),
                        },
                        { _id: playerThree._id, ...getInitialPlayerData({ pointsPlayed: 1 }) },
                    ],
                    teamOne: {},
                    teamTwo: {},
                },
                {
                    players: [
                        {
                            _id: playerOne._id,
                            ...getInitialPlayerData({
                                goals: 0,
                                assists: 1,
                                touches: 1,
                                completedPasses: 1,
                                pointsPlayed: 1,
                            }),
                        },
                        {
                            _id: playerTwo._id,
                            ...getInitialPlayerData({ goals: 1, touches: 1, catches: 1, pointsPlayed: 1 }),
                        },
                        { _id: playerThree._id, ...getInitialPlayerData({ pointsPlayed: 2 }) },
                    ],
                    teamOne: {},
                    teamTwo: {},
                },
                {
                    players: [
                        {
                            _id: playerOne._id,
                            ...getInitialPlayerData({ goals: 1, touches: 1, catches: 1, pointsPlayed: 1 }),
                        },
                        { _id: playerTwo._id, ...getInitialPlayerData({ pointsPlayed: 2 }) },
                        {
                            _id: playerThree._id,
                            ...getInitialPlayerData({ assists: 1, completedPasses: 1, pointsPlayed: 1, touches: 1 }),
                        },
                    ],
                    teamOne: {},
                    teamTwo: {},
                },
            ],
        })

        await AtomicPlayer.create({
            playerId: playerOne._id,
            gameId: gameOneId,
            teamId: teamOne._id,
            ...playerOne,
            _id: new Types.ObjectId(),
            ...getInitialPlayerData({ goals: 3, catches: 4, pointsPlayed: 4 }),
        })
        await AtomicPlayer.create({
            playerId: playerTwo._id,
            gameId: gameOneId,
            teamId: teamOne._id,
            ...playerTwo,
            _id: new Types.ObjectId(),
            ...getInitialPlayerData({ assists: 2, completedPasses: 2, touches: 2, catches: 1, pointsPlayed: 4 }),
        })
        await AtomicPlayer.create({
            playerId: playerThree._id,
            gameId: gameOneId,
            teamId: teamOne._id,
            ...playerThree,
            _id: new Types.ObjectId(),
            ...getInitialPlayerData({ assists: 1, pointsPlayed: 4 }),
        })

        await AtomicPlayer.create({
            playerId: playerOne._id,
            gameId: gameTwoId,
            teamId: teamOne._id,
            ...playerOne,
            _id: new Types.ObjectId(),
            ...getInitialPlayerData({ goals: 1, assists: 1 }),
        })
        await AtomicPlayer.create({
            playerId: playerTwo._id,
            gameId: gameTwoId,
            teamId: teamOne._id,
            ...playerTwo,
            _id: new Types.ObjectId(),
            ...getInitialPlayerData({ goals: 1, assists: 1 }),
        })
        await AtomicPlayer.create({
            playerId: playerThree._id,
            gameId: gameTwoId,
            teamId: teamOne._id,
            ...playerThree,
            _id: new Types.ObjectId(),
            ...getInitialPlayerData({ goals: 1, assists: 1 }),
        })
    })

    it('correctly rebuilds data', async () => {
        await rebuildAtomicPlayers(gameOneId.toHexString())

        const ap1 = await AtomicPlayer.find({ playerId: playerOne._id, gameId: gameOneId })
        expect(ap1.length).toBe(1)
        expect(ap1[0].goals).toBe(2)
        expect(ap1[0].pointsPlayed).toBe(3)
        expect(ap1[0].assists).toBe(1)
        expect(ap1[0].touches).toBe(3)

        const ap2 = await AtomicPlayer.find({ playerId: playerTwo._id, gameId: gameOneId })
        expect(ap2.length).toBe(1)
        expect(ap2[0].goals).toBe(1)
        expect(ap2[0].assists).toBe(1)
        expect(ap2[0].pointsPlayed).toBe(3)
        expect(ap2[0].touches).toBe(2)

        const ap3 = await AtomicPlayer.find({ playerId: playerThree._id, gameId: gameOneId })
        expect(ap3.length).toBe(1)
        expect(ap3[0].goals).toBe(0)
        expect(ap3[0].assists).toBe(1)
        expect(ap3[0].pointsPlayed).toBe(3)
        expect(ap3[0].touches).toBe(1)

        const updatedGame = await Game.findById(gameOneId)
        for (const point of updatedGame!.points) {
            for (const player of point.players) {
                expect(player.pointsPlayed).toBe(1)
            }
        }
    })

    it('with unfound game', async () => {
        await expect(rebuildAtomicPlayers(new Types.ObjectId().toHexString())).rejects.toThrowError(
            new ApiError(Constants.GAME_NOT_FOUND, 404),
        )
    })
})
