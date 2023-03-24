import app from './app'
import dotenv from 'dotenv'

const pathToEnv = process.cwd() + '/src/config/.env'
dotenv.config({ path: pathToEnv })

app.listen(process.env.PORT, () => {
    console.log('listening')
})
