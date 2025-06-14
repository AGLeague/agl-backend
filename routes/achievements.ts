import { Router } from "express"
import StatsSource from "../helpers/sheetsService"
import DbModel from "../models"

enum Rarity {
	Common = "C",
	Uncommon = "U",
	Rare = "R",
	Mythic = "M",
	SPG = "S",
}
function getRarity(ach: {
	common: boolean
	uncommon: boolean
	rare: boolean
	mythic: boolean
	spg: boolean
}) {
	if (ach.spg)
		return Rarity.SPG
	if (ach.mythic)
		return Rarity.Mythic
	if (ach.rare)
		return Rarity.Rare
	if (ach.uncommon)
		return Rarity.Uncommon
	if (ach.common)
		return Rarity.Common
}

function achievementRouter(statsSource: StatsSource, model: DbModel) {


	const router = Router()

	router.get("/:playerId", async (req, res) => {

		let player = await statsSource.getPlayer(req.params.playerId)

		if (!player) {
			res.status(404).json({
				error: { message: "Player not found" }
			})
			return
		}

		let achievementData = []
		let dbAchievements = await model.getAchievements(player.id)


		for (let achievement of dbAchievements) {
			achievementData.push({
				name: achievement.name,
				rarity: getRarity(achievement),
				collectorNumber: achievement.collector,
			})
		}

		res.status(200).json({
			data: {
				achievementData
			}
		})
	})

	return router

}

export default achievementRouter
