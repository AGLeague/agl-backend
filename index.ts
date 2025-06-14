import express, { Express, Request, Response } from "express"
import cors from "cors"

import playerRoute from "./routes/players"
import DbModel from "./models"
import { Sequelize } from "sequelize"
import StatsSource from "./helpers/sheetsService"

import winston from "winston"
import { SheetReaderFactory } from "./sheets/leagueSheet"
import { adminRouter } from "./routes/admin"

import fs from 'fs/promises'

const logger = winston.createLogger({
	level: 'info',
	format: winston.format.json(),
	defaultMeta: { service: 'app' },
	transports: [
		new winston.transports.Console()
	],
})

logger.info("Created a logger")

const app: Express = express()

app.use(express.json())
app.use(cors())

const API_KEY = process.env.API_KEY
const STATS_SHEET_ID = process.env.STATS_SHEET
const PASSWORD = process.env.PASSWORD
const DB_PATH = process.env.DB_PATH ?? "db.sqlite"
const DB_LOGGING_LEVEL = process.env.DB_LOGGING_LEVEL ?? "debug"

if (!API_KEY)
	throw new Error("Missing API Key")

if (!STATS_SHEET_ID)
	throw new Error("Missing Stats Sheet Id")

if (!PASSWORD)
	throw new Error("Missing PASSWORD")

const dbLogger = logger.child({ service: 'sequelize' })

let dbLogFunc = (msg: string) => dbLogger.log(DB_LOGGING_LEVEL, msg)

const sequelize = new Sequelize('sqlite:' + DB_PATH, { logging: dbLogFunc})

const model = new DbModel(sequelize, logger.child({ service: 'db-model' }))
const statsSource = new StatsSource(model, logger.child({ service: 'stats-source' }))
const sheetReaderFactory = new SheetReaderFactory(API_KEY, logger.child({ service: "SheetFactory" }), STATS_SHEET_ID)

app.use("/api/players", playerRoute(statsSource, logger.child({ route: 'players' }), model))
app.use("/api/admin", adminRouter(sheetReaderFactory, model, logger.child({ route: 'admin' }), PASSWORD))

app.get("/", (_: Request, res: Response) => {
	res.send("A placeholder for something cool coming soon")
})

const port = process.env.PORT || 8000

async function loadSqlViews() {
	let files = await fs.readdir('./sql/')

	for (let file of files) {
		console.log(file)
		let data = await fs.readFile('./sql/' + file, {encoding: 'utf-8'})

		let statements = data.split(';')
		for (let statement of statements) {
			statement = statement.trim()
			if (statement) {
				let result = await sequelize.query(statement)
				console.log(result)
			}
		}
	}
}


model.initialize().then(async () => {
	logger.info("Tables initialized")
	await loadSqlViews()
	logger.info("Views initialized")
}).then(() => {
	app.listen(port, () => {
		logger.info(`App listening on port ${port}`)
	})
})
