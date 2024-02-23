import AtomicPlayer from '../../models/atomic-player'
import AtomicConnection from '../../models/atomic-connection'
import Game from '../../models/game'
import { EmbeddedPlayer } from '../../types/player'
import { idEquals } from '../../utils/utils'
import { Types } from 'mongoose'
import AtomicTeam from '../../models/atomic-team'
import { addPlayerData } from '../../utils/player-stats'
import { addConnectionData } from '../../utils/connection-stats'

export const reconcileGuest = async (teamIds: string[], guestId: string, user: EmbeddedPlayer) => {
    await reconcileGuestForGames(teamIds, guestId, user)

    await reconcileGuestForTeams(teamIds, guestId, user._id)

    await reconcileGuestForPlayers(guestId, user)

    await reconcileGuestForConnections(guestId, user._id)
}

const reconcileGuestForGames = async (teamIds: string[], guestId: string, user: EmbeddedPlayer) => {
    const teamOneGames = await Game.find({ teamOneId: teamIds })
    const teamTwoGames = await Game.find({ teamTwoId: teamIds })

    for (const game of [...teamOneGames, ...teamTwoGames]) {
        for (let i = 0; i < game.points.length; i++) {
            // replace player in list
            const realUserIndex = game.points[i].players.findIndex((p) => idEquals(p._id, user._id))
            const guestUserIndex = game.points[i].players.findIndex((p) => idEquals(p._id, guestId))

            if (guestUserIndex < 0) continue
            if (realUserIndex >= 0) {
                game.points[i].players[realUserIndex] = {
                    _id: user._id,
                    ...addPlayerData(game.points[i].players[realUserIndex], game.points[i].players[guestUserIndex]),
                }
            } else {
                game.points[i].players[guestUserIndex]._id = user._id
            }

            // update connections
            for (let j = 0; j < game.points[i].connections.length; j++) {
                if (idEquals(game.points[i].connections[j].throwerId, guestId)) {
                    const realUserConnectionIndex = game.points[i].connections.findIndex(
                        (c) =>
                            idEquals(c.throwerId, user._id) &&
                            idEquals(c.receiverId, game.points[i].connections[j].receiverId),
                    )
                    if (realUserConnectionIndex >= 0) {
                        game.points[i].connections[realUserConnectionIndex] = {
                            throwerId: game.points[i].connections[realUserConnectionIndex].throwerId,
                            receiverId: game.points[i].connections[realUserConnectionIndex].receiverId,
                            ...addConnectionData(
                                game.points[i].connections[realUserConnectionIndex],
                                game.points[i].connections[j],
                            ),
                        }
                        game.points[i].connections.splice(j, 1)
                    } else {
                        game.points[i].connections[j].throwerId = new Types.ObjectId(user._id)
                    }
                } else if (idEquals(game.points[i].connections[j].receiverId, guestId)) {
                    const realUserConnectionIndex = game.points[i].connections.findIndex(
                        (c) =>
                            idEquals(c.receiverId, user._id) &&
                            idEquals(c.throwerId, game.points[i].connections[j].throwerId),
                    )
                    if (realUserConnectionIndex >= 0) {
                        game.points[i].connections[realUserConnectionIndex] = {
                            throwerId: game.points[i].connections[realUserConnectionIndex].throwerId,
                            receiverId: game.points[i].connections[realUserConnectionIndex].receiverId,
                            ...addConnectionData(
                                game.points[i].connections[realUserConnectionIndex],
                                game.points[i].connections[j],
                            ),
                        }
                        game.points[i].connections.splice(j, 1)
                    } else {
                        game.points[i].connections[j].receiverId = new Types.ObjectId(user._id)
                    }
                }
            }
        }
        await game.save()
    }
}

const reconcileGuestForTeams = async (teamIds: string[], guestId: string, userId: string | Types.ObjectId) => {
    const teams = await AtomicTeam.find({ teamId: teamIds })
    for (const team of teams) {
        // TODO: ensure real user is not already on team
        const guestUserIndex = team.players.findIndex((p) => idEquals(p, guestId))
        if (guestUserIndex < 0) continue

        const realUserIndex = team.players.findIndex((p) => idEquals(p, userId))
        if (realUserIndex >= 0) {
            team.players.splice(guestUserIndex, 1)
        } else {
            team.players[guestUserIndex] = new Types.ObjectId(userId)
        }

        await team.save()
    }
}

const reconcileGuestForPlayers = async (guestId: string, user: EmbeddedPlayer) => {
    const guestPlayers = await AtomicPlayer.find({ playerId: guestId })
    const realPlayers = await AtomicPlayer.find({ playerId: user._id, gameId: guestPlayers.map((p) => p.gameId) })

    for (const player of guestPlayers) {
        const realPlayer = realPlayers.find((p) => idEquals(p.gameId, player.gameId))
        if (realPlayer) {
            await realPlayer.updateOne({ ...addPlayerData(realPlayer, player) })
            await player.deleteOne()
        } else {
            player.playerId = new Types.ObjectId(user._id)
            player.firstName = user.firstName
            player.lastName = user.lastName
            player.username = user.username
            await player.save()
        }
    }
}

const reconcileGuestForConnections = async (guestId: string, userId: string | Types.ObjectId) => {
    const connections = await AtomicConnection.find({ $or: [{ receiverId: guestId }, { throwerId: guestId }] })
    for (const connection of connections) {
        if (idEquals(connection.throwerId, guestId)) {
            const realUserConnection = await AtomicConnection.findOne({
                throwerId: userId,
                receiverId: connection.receiverId,
                gameId: connection.gameId,
            })
            if (realUserConnection) {
                await realUserConnection.updateOne({ ...addConnectionData(realUserConnection, connection) })
                await connection.deleteOne()
            } else {
                connection.throwerId = new Types.ObjectId(userId)
                await connection.save()
            }
        } else if (idEquals(connection.receiverId, guestId)) {
            const realUserConnection = await AtomicConnection.findOne({
                throwerId: connection.throwerId,
                receiverId: userId,
                gameId: connection.gameId,
            })
            if (realUserConnection) {
                await realUserConnection.updateOne({ ...addConnectionData(realUserConnection, connection) })
                await connection.deleteOne()
            } else {
                connection.receiverId = new Types.ObjectId(userId)
                await connection.save()
            }
        }
    }
}
