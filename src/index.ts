import express from 'express'
import dotenv from 'dotenv'

const pathToEnv = process.cwd() + '/src/config/.env'
dotenv.config({ path: pathToEnv })

const app = express()

app.get('/ultmt-stats', (req, res) => {
    return res.json({ message: 'The statistics microservice of The Ultmt App' })
})

app.listen(process.env.PORT, () => {
    console.log('listening')
})
