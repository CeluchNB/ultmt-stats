import AtomicStat from "../../models/atomic-stat"
import Game from "../../models/game"
import { GameInput } from "../../types/game"
import Team from "../../models/team"
import Player from "../../models/player"
import { Types } from 'mongoose'

export const createGame = async (gameInput: GameInput) => {
    const prevGame = await Game.findById(gameInput._id)

    if (prevGame) {
        return
    }

    // create teams if not exists
    let teamOne = await Team.findById(gameInput.teamOne._id)
    if (!teamOne) {
        teamOne = await Team.create({ ...gameInput.teamOne, continuationId: new Types.ObjectId() })
    }

    
    let teamTwo = await Team.findById(gameInput.teamTwo._id)
    if (!teamTwo && gameInput.teamTwo._id) {
        teamTwo = await Team.create({ ...gameInput.teamTwo, continuationId: new Types.ObjectId() })
    }

    // create game
    const game = await Game.create({ startTime: gameInput.startTime, teamOneId: teamOne._id, teamTwoId: teamTwo ? teamTwo._id : undefined })
    teamOne.games.push(game._id)
    teamTwo?.games.push(game._id)
    await teamOne.save()
    await teamTwo?.save()

    // create players if not exists
    for (const p of gameInput.teamOnePlayers) {
        let player = await Player.findById(p._id)
        if (!player) {
            player = await Player.create({ ...p })
        }
        player.games.push(game._id)
        await player.save()
        await AtomicStat.create({ playerId: player._id, teamId: teamOne._id, gameId: game._id })
    }

    for (const p of gameInput.teamTwoPlayers) {
        let player = await Player.findById(p._id)
        if (!player) {
            player = await Player.create({ ...p })
        }
        player.games.push(game._id)
        await player.save()
        await AtomicStat.create({ playerId: player._id, teamId: teamOne._id, gameId: game._id })
    }
}
