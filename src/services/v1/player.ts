import * as Constants from '../../utils/constants'
import Player from '../../models/player'
import { ApiError } from '../../types/error'
import IPlayer from '../../types/player'

export const getPlayerById = async (playerId: string): Promise<IPlayer> => {
    const player = await Player.findById(playerId)
    if (!player) {
        throw new ApiError(Constants.PLAYER_NOT_FOUND, 404)
    }

    return player
}
