import app from './app'
import dotenv from 'dotenv'
import { connectDatabase } from './loaders/mongoose'

const pathToEnv = process.cwd() + '/src/config/.env'
dotenv.config({ path: pathToEnv })

connectDatabase().then(() => {
    app.listen(process.env.PORT, () => {
        console.log('listening')
    })
})
