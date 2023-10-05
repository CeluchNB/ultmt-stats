import * as Constants from '../../utils/constants'
import AtomicConnection from '../../models/atomic-connection'
import Connection from '../../models/connection'
import { IConnection } from '../../types/connection'
import { ApiError } from '../../types/error'

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
    gameId: string,
): Promise<IConnection> => {
    const connection = await AtomicConnection.findOne({ throwerId, receiverId, gameId })
    if (!connection) {
        throw new ApiError(Constants.CONNECTION_NOT_FOUND, 404)
    }

    return connection
}
