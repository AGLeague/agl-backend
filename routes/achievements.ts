import { Router } from "express"
import StatsSource from "../helpers/sheetsService"

enum Rarity {
	Common = "C",
	Uncommon = "U",
	Rare = "R",
	Mythic = "M",
	SPG = "S",
}

function achievementRouter(statsSource: StatsSource) {


	const router = Router()

	router.get("/:playerId", async (req, res) => {

		let player = await statsSource.getPlayer(req.params.playerId)

		if (!player) {
			res.status(404).json({
				error: { message: "Player not found" }
			})
			return
		}

		let achievements: { name: string, rarity: Rarity, collectorNumber: number }[] = []
		if (player.leagues.length >= 30) {
			achievements.push({ name: "League Loyalist", rarity: Rarity.SPG, collectorNumber: 25 })
		} else if (player.leagues.length >= 20) {
			achievements.push({ name: "League Loyalist", rarity: Rarity.Mythic, collectorNumber: 25 })
		} else if (player.leagues.length >= 10) {
			achievements.push({ name: "League Loyalist", rarity: Rarity.Rare, collectorNumber: 25 })
		} else if (player.leagues.length >= 5) {
			achievements.push({ name: "League Loyalist", rarity: Rarity.Uncommon, collectorNumber: 25 })
		} else if (player.leagues.length >= 3) {
			achievements.push({ name: "League Loyalist", rarity: Rarity.Common, collectorNumber: 25 })
		}

		res.status(200).json({
			data: {
				achievements
			}
		})
	})

	return router

}

export default achievementRouter
