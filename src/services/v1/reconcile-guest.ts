import AtomicPlayer from '../../models/atomic-player'
import AtomicConnection from '../../models/atomic-connection'
import Game from '../../models/game'
import { EmbeddedPlayer } from '../../types/player'
import { idEquals } from '../../utils/utils'
import { Types } from 'mongoose'
import AtomicTeam from '../../models/atomic-team'
import { IConnection } from '../../types/connection'

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
            for (let j = 0; j < game.points[i].players.length; j++) {
                if (idEquals(game.points[i].players[j]._id, guestId)) {
                    game.points[i].players[j]._id = new Types.ObjectId(user._id)
                }
            }

            // update connections
            for (let j = 0; j < game.points[i].connections.length; j++) {
                updateConnection(game.points[i].connections[j], guestId, user._id)
            }
        }
        await game.save()
    }
}

const reconcileGuestForTeams = async (teamIds: string[], guestId: string, userId: string | Types.ObjectId) => {
    const teams = await AtomicTeam.find({ teamId: teamIds })
    for (const team of teams) {
        for (let i = 0; i < team.players.length; i++) {
            if (idEquals(team.players[i], guestId)) {
                team.players[i] = new Types.ObjectId(userId)
            }
        }
        await team.save()
    }
}

const reconcileGuestForPlayers = async (guestId: string, user: EmbeddedPlayer) => {
    const players = await AtomicPlayer.find({ playerId: guestId })
    for (const player of players) {
        if (idEquals(player.playerId, guestId)) {
            player.playerId = new Types.ObjectId(user._id)
            player.firstName = user.firstName
            player.lastName = user.lastName
            player.username = user.username
        }
        await player.save()
    }
}

const reconcileGuestForConnections = async (guestId: string, userId: string | Types.ObjectId) => {
    const connections = await AtomicConnection.find({ $or: [{ receiverId: guestId }, { throwerId: guestId }] })
    for (const connection of connections) {
        updateConnection(connection, guestId, userId)
        await connection.save()
    }
}

const updateConnection = (connection: IConnection, guestId: string, userId: string | Types.ObjectId) => {
    if (idEquals(connection.receiverId, guestId)) {
        connection.receiverId = new Types.ObjectId(userId)
    } else if (idEquals(connection.throwerId, guestId)) {
        connection.throwerId = new Types.ObjectId(userId)
    }
}
