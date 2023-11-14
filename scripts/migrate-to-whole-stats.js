/* eslint-disable no-undef */

players = db.players.find().toArray()

for (const player of players) {
    db.atomicplayers.updateMany(
        { playerId: player._id },
        { $set: { firstName: player.firstName, lastName: player.lastName, username: player.username } },
    )
}

teams = db.teams.find().toArray()

for (const team of teams) {
    db.atomicteams.updateMany(
        { teamId: team._id },
        {
            $set: {
                name: team.name,
                place: team.place,
                teamname: team.teamname,
                seasonStart: team.seasonStart,
                seasonEnd: team.seasonEnd,
                players: team.players,
            },
            $unset: { startDate: 1, endDate: 1 },
        },
        { multi: true },
    )
}

db.teams.drop()
db.connections.drop()
db.players.drop()
