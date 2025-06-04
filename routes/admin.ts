import { Router } from "express"
import StatsSource, { SheetsModel } from "../helpers/sheetsService"
import DbModel from "../models"

function adminRouter(source: SheetsModel, db: DbModel, password: string) {
	const router = Router()

	router.get("/refresh/winRates", async function(req, res) {
		if (req.query.password !== password) {
			res.status(401).json({ error: "Unauthorized" })
		}

		try {
			let winRates = await source.getWinRates()

			await db.updatePlayersWinRate(winRates)

			res.status(200).json({ data: "Success!" })
		} catch (ex) {
			res.status(500).json({ error: ex })
		}
	})

	router.get("/refresh/top8s", async function(req, res) {
		if (req.query.password !== password) {
			res.status(401).json({ error: "Unauthorized" })
		}

		let top8s = await source.getTop8s()

		await db.updatePlayersTop8s(top8s)

		res.status(200).json({ data: "Success!" })
	})

	router.get("/refresh/leagues", async function(req, res) {
		if (req.query.password !== password) {
			res.status(401).json({ error: "Unauthorized" })
		}

		try {
			let leagues = await source.populateLeagueCount()

			for (let league of leagues) {
				await db.setLeaguePlayers(league.leagueName, league.players)
			}

			res.status(200).json({ data: "Success!" })
		} catch (ex) {
			res.status(500).json({ error: ex })
		}
	})

	return router
}

export default adminRouter
