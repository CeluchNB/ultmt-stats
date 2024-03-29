import AtomicConnection from '../../../../src/models/atomic-connection'
import AtomicPlayer from '../../../../src/models/atomic-player'
import AtomicTeam from '../../../../src/models/atomic-team'
import Game from '../../../../src/models/game'
import { resetDatabase, setUpDatabase, tearDownDatabase } from '../../../fixtures/setup-db'
import { reconcileGuest } from '../../../../src/services/v1/reconcile-guest'
import { Types } from 'mongoose'

beforeAll(async () => {
    await setUpDatabase()
})

afterEach(async () => {
    await resetDatabase()
})

afterAll(async () => {
    await tearDownDatabase()
})

describe('reconcile guest methods', () => {
    describe('reconcileGuest', () => {
        const teamOneId = new Types.ObjectId()
        const teamTwoId = new Types.ObjectId()

        const guestId = new Types.ObjectId()
        const realUserId = new Types.ObjectId()
        const userOneId = new Types.ObjectId()
        const userTwoId = new Types.ObjectId()

        it('replaces players and connections in game', async () => {
            await Game.create({
                teamOneId,
                teamTwoId: new Types.ObjectId(),
                points: [
                    {
                        players: [{ _id: userOneId }, { _id: guestId }, { _id: userTwoId }],
                        connections: [
                            { throwerId: guestId, receiverId: userOneId },
                            { throwerId: userOneId, receiverId: userTwoId },
                        ],
                        teamOne: {},
                        teamTwo: {},
                    },
                ],
            })
            await Game.create({
                teamOneId: new Types.ObjectId(),
                teamTwoId,
                points: [
                    {
                        players: [{ _id: userOneId }, { _id: guestId }, { _id: userTwoId }],
                        connections: [
                            { throwerId: userTwoId, receiverId: guestId },
                            { throwerId: userOneId, receiverId: userTwoId },
                        ],
                        teamOne: {},
                        teamTwo: {},
                    },
                ],
            })

            await reconcileGuest([teamOneId.toHexString(), teamTwoId.toHexString()], guestId.toHexString(), {
                _id: realUserId,
                firstName: 'Test',
                lastName: 'Test',
                username: 'test',
            })

            const gameResults = await Game.find()
            expect(gameResults[0].points[0].players).toEqual(
                expect.arrayContaining([expect.objectContaining({ _id: realUserId })]),
            )
            expect(gameResults[0].points[0].connections).toEqual(
                expect.arrayContaining([expect.objectContaining({ throwerId: realUserId })]),
            )

            expect(gameResults[1].points[0].players).toEqual(
                expect.arrayContaining([expect.objectContaining({ _id: realUserId })]),
            )
            expect(gameResults[1].points[0].connections).toEqual(
                expect.arrayContaining([expect.objectContaining({ receiverId: realUserId })]),
            )
        })

        it('replaces player in atomic team', async () => {
            await AtomicTeam.create({
                teamId: teamOneId,
                teamname: 'test',
                name: 'Name',
                place: 'Place',
                gameId: new Types.ObjectId(),
                players: [userOneId, userTwoId, guestId],
            })

            await AtomicTeam.create({
                teamId: teamTwoId,
                teamname: 'test',
                name: 'Name',
                place: 'Place',
                gameId: new Types.ObjectId(),
                players: [realUserId, guestId, userTwoId],
            })

            await AtomicTeam.create({
                teamId: teamTwoId,
                teamname: 'test',
                name: 'Name',
                place: 'Place',
                gameId: new Types.ObjectId(),
                players: [realUserId, userTwoId],
            })

            await reconcileGuest([teamOneId.toHexString(), teamTwoId.toHexString()], guestId.toHexString(), {
                _id: realUserId,
                firstName: 'Test',
                lastName: 'Test',
                username: 'test',
            })

            const teams = await AtomicTeam.find()
            expect(teams[0].players.length).toBe(3)
            expect(teams[0].players).toEqual(expect.arrayContaining([realUserId]))
            expect(teams[0].players).toEqual(expect.not.arrayContaining([guestId]))

            expect(teams[1].players.length).toBe(2)
            expect(teams[1].players).toEqual(expect.arrayContaining([realUserId]))
            expect(teams[1].players).toEqual(expect.not.arrayContaining([guestId]))

            expect(teams[2].players.length).toBe(2)
            expect(teams[2].players).toEqual(expect.arrayContaining([realUserId]))
            expect(teams[2].players).toEqual(expect.not.arrayContaining([guestId]))
        })

        it('replaces player fields on atomic player', async () => {
            const gameId = new Types.ObjectId()
            await Game.create({
                _id: gameId,
                teamOneId,
                teamTwoId: new Types.ObjectId(),
                points: [
                    {
                        players: [
                            { _id: realUserId, breaks: 1, pointsPlayed: 1 },
                            { _id: guestId, breaks: 1, pointsPlayed: 1 },
                            { _id: userTwoId },
                        ],
                        connections: [
                            { throwerId: guestId, receiverId: userOneId },
                            { throwerId: userOneId, receiverId: userTwoId },
                        ],
                        teamOne: {},
                        teamTwo: {},
                    },
                    {
                        players: [{ _id: guestId, breaks: 1, pointsPlayed: 1 }, { _id: userTwoId }],
                        connections: [
                            { throwerId: guestId, receiverId: userOneId },
                            { throwerId: userOneId, receiverId: userTwoId },
                        ],
                        teamOne: {},
                        teamTwo: {},
                    },
                ],
            })

            await AtomicPlayer.create({
                playerId: guestId,
                firstName: 'Guest',
                lastName: 'Guest',
                username: 'guest',
                teamId: teamOneId,
                gameId: new Types.ObjectId(),
            })
            await AtomicPlayer.create({
                playerId: guestId,
                firstName: 'Guest',
                lastName: 'Guest',
                username: 'guest',
                teamId: teamOneId,
                gameId,
                catches: 1,
                breaks: 2,
                pointsPlayed: 2,
            })
            await AtomicPlayer.create({
                playerId: userOneId,
                firstName: 'User',
                lastName: 'One',
                username: 'userone',
                teamId: teamTwoId,
                gameId: new Types.ObjectId(),
            })
            await AtomicPlayer.create({
                playerId: realUserId,
                firstName: 'Real',
                lastName: 'Real',
                username: 'real',
                teamId: teamOneId,
                gameId,
                catches: 1,
                breaks: 1,
                pointsPlayed: 1,
            })

            await reconcileGuest([teamOneId.toHexString(), teamTwoId.toHexString()], guestId.toHexString(), {
                _id: realUserId,
                firstName: 'Real',
                lastName: 'Real',
                username: 'real',
            })

            const players = await AtomicPlayer.find()
            expect(players.length).toBe(3)
            expect(players).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        playerId: realUserId,
                        firstName: 'Real',
                        lastName: 'Real',
                        username: 'real',
                        catches: 0,
                    }),
                    expect.objectContaining({
                        playerId: realUserId,
                        firstName: 'Real',
                        lastName: 'Real',
                        username: 'real',
                        catches: 2,
                        breaks: 2,
                        pointsPlayed: 2,
                    }),
                    expect.objectContaining({
                        playerId: userOneId,
                        firstName: 'User',
                        lastName: 'One',
                        username: 'userone',
                        catches: 0,
                    }),
                ]),
            )
        })

        it('replaces thrower and receiver in atomic connection', async () => {
            await AtomicConnection.create({
                throwerId: userOneId,
                receiverId: guestId,
                teamId: teamOneId,
                gameId: new Types.ObjectId(),
            })
            await AtomicConnection.create({
                throwerId: guestId,
                receiverId: userTwoId,
                teamId: teamTwoId,
                gameId: new Types.ObjectId(),
            })

            await reconcileGuest([teamOneId.toHexString(), teamTwoId.toHexString()], guestId.toHexString(), {
                _id: realUserId,
                firstName: 'Real',
                lastName: 'Real',
                username: 'real',
            })

            const connections = await AtomicConnection.find()
            expect(connections[0]).toMatchObject({
                throwerId: userOneId,
                receiverId: realUserId,
            })
            expect(connections[1]).toMatchObject({
                throwerId: realUserId,
                receiverId: userTwoId,
            })
        })

        it('handles player and connections already existing in game', async () => {
            await Game.create({
                teamOneId,
                teamTwoId: new Types.ObjectId(),
                points: [
                    {
                        players: [
                            { _id: realUserId, catches: 1, holds: 1 },
                            { _id: guestId, catches: 1, holds: 1 },
                            { _id: userTwoId },
                        ],
                        connections: [
                            { throwerId: guestId, receiverId: userOneId, catches: 1 },
                            { throwerId: userOneId, receiverId: userTwoId },
                            { throwerId: realUserId, receiverId: userOneId, catches: 1 },
                            { throwerId: userOneId, receiverId: guestId, drops: 1 },
                            { throwerId: userOneId, receiverId: realUserId, drops: 1 },
                        ],
                        teamOne: {},
                        teamTwo: {},
                    },
                    {
                        players: [{ _id: realUserId, catches: 1 }, { _id: userTwoId }],
                        connections: [],
                        teamOne: {},
                        teamTwo: {},
                    },
                ],
            })

            await reconcileGuest([teamOneId.toHexString(), teamTwoId.toHexString()], guestId.toHexString(), {
                _id: realUserId,
                firstName: 'Test',
                lastName: 'Test',
                username: 'test',
            })

            const gameResult = await Game.findOne()
            expect(gameResult!.points[0].players).toEqual(
                expect.arrayContaining([expect.objectContaining({ _id: realUserId, catches: 2, holds: 1 })]),
            )
            expect(gameResult!.points[0].connections.length).toBe(3)
            expect(gameResult!.points[0].connections).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ throwerId: realUserId, catches: 2 }),
                    expect.objectContaining({ receiverId: realUserId, drops: 2 }),
                ]),
            )
            expect(gameResult!.points[1].players.length).toBe(2)
        })

        it('handles previous connection already existing', async () => {
            const gameId = new Types.ObjectId()
            await AtomicConnection.create({
                throwerId: userOneId,
                receiverId: guestId,
                teamId: teamOneId,
                gameId,
                catches: 1,
            })
            await AtomicConnection.create({
                throwerId: guestId,
                receiverId: userTwoId,
                teamId: teamTwoId,
                gameId,
                drops: 1,
            })
            await AtomicConnection.create({
                throwerId: userOneId,
                receiverId: realUserId,
                teamId: teamOneId,
                gameId,
                catches: 1,
            })
            await AtomicConnection.create({
                throwerId: realUserId,
                receiverId: userTwoId,
                teamId: teamTwoId,
                gameId,
                drops: 1,
            })

            await reconcileGuest([teamOneId.toHexString(), teamTwoId.toHexString()], guestId.toHexString(), {
                _id: realUserId,
                firstName: 'Real',
                lastName: 'Real',
                username: 'real',
            })

            const connections = await AtomicConnection.find()
            expect(connections.length).toBe(2)
            expect(connections[0]).toMatchObject({
                throwerId: userOneId,
                receiverId: realUserId,
                catches: 2,
            })
            expect(connections[1]).toMatchObject({
                throwerId: realUserId,
                receiverId: userTwoId,
                drops: 2,
            })
        })
    })
})
