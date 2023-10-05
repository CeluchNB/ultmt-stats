import * as Constants from '../../utils/constants'
import AtomicConnection from '../../models/atomic-connection'
import Connection from '../../models/connection'
import { IConnection } from '../../types/connection'
import { ApiError } from '../../types/error'
import { FilterQuery } from 'mongoose'
import { IAtomicConnection } from '../../types/atomic-stat'

export const getConnection = async (throwerId: string, receiverId: string): Promise<IConnection> => {
    const connection = await Connection.findOne({ throwerId, receiverId })
    if (!connection) {
        throw new ApiError(Constants.CONNECTION_NOT_FOUND, 404)
    }

    return connection
}

export const getConnectionByGame = async (
    throwerId: string,
    receiverId: string,
    gameIds: string[],
    teamIds: string[],
): Promise<IAtomicConnection[]> => {
    const filter: { $and: FilterQuery<IAtomicConnection>[] } = {
        $and: [{ throwerId }, { receiverId }],
    }
    if (gameIds.length > 0) {
        filter.$and.push({ gameId: { $in: gameIds } })
    }
    if (teamIds.length > 0) {
        filter.$and.push({ teamId: { $in: teamIds } })
    }

    const connections = await AtomicConnection.find(filter)
    if (connections.length === 0) {
        throw new ApiError(Constants.CONNECTION_NOT_FOUND, 404)
    }

    return connections
}
