// test

connections = db.atomicconnections.deleteMany({ gameId: ObjectId('') })
// connections.deleteMany()

players = db.atomicplayers.deleteMany({ gameId: ObjectId('') })
// players.deleteMany()

teams = db.atomicteams.deleteOne({ gameId: ObjectId('') })
// teams.deleteMany()

game = db.games.deleteOne({ _id: ObjectId('') })
// game.deleteMany()
