import express from 'express'

const app = express()

app.get('/ultmt-stats', (req, res) => {
    return res.json({ message: 'The statistics microservice of The Ultmt App' })
})

app.post('/game/ingest', (req, res) => {
    console.log('got request', JSON.stringify(req.body))
    return res.status(201).send()
})

export default app
