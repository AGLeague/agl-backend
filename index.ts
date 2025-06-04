import express, { Express, Request, Response } from "express"
import cors from "cors"

import playerRoute from "./routes/players"
import DbModel from "./models"
import { Sequelize } from "sequelize"
import StatsSource, { SheetsModel } from "./helpers/sheetsService"
import adminRouter from "./routes/admin"

const app: Express = express()

app.use(express.json())
app.use(cors())

const API_KEY = process.env.API_KEY
const STATS_SHEET_ID = process.env.STATS_SHEET
const PASSWORD = process.env.PASSWORD
if (!API_KEY)
	throw new Error("Missing API Key")

if (!STATS_SHEET_ID)
	throw new Error("Missing Stats Sheet Id")

if (!PASSWORD)
	throw new Error("Missing PASSWORD")

const model = new DbModel(new Sequelize('sqlite:db.sqlite'))
const statsSource = new StatsSource(model)
const sheetsSource = new SheetsModel(API_KEY, STATS_SHEET_ID)

app.use("/api/players", playerRoute(statsSource))
app.use("/api/admin", adminRouter(sheetsSource, model, PASSWORD))

app.get("/", (_: Request, res: Response) => {
	res.send("A placeholder for something cool coming soon")
})

const port = process.env.PORT || 8000

model.initialize().then(() => {
	console.log("Tables initialized")
}).then(() => {
	app.listen(port, () => {
		console.log(`App listening on port ${port}`)
	})
})
