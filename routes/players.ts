import { Router } from "express"

import { getLinks } from "../helpers/responseHelpers"
import StatsSource from "../helpers/sheetsService"
import winston from "winston"
import DbModel from "../models"

enum Rarity {
	Common = "C",
	Uncommon = "U",
	Rare = "R",
	Mythic = "M",
	SPG = "S",
}

function getSearchParamAsNumber(
	url: URL,
	param: string,
	defaultValue: number,
): number {
	if (!url.searchParams.has(param))
		return defaultValue

	const paramValue = url.searchParams.get(param)

	if (!paramValue)
		return defaultValue

	return parseInt(paramValue)
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



function playerRouter(statsSource: StatsSource, logger: winston.Logger, model: DbModel) {
	const router = Router()

	router.get("", async function(req, res) {
		const url = new URL(`${req.protocol}://${req.get("host")}${req.originalUrl}`)

		try {
			// First page is the default
			const page = getSearchParamAsNumber(url, "page", 1)
			// If we are aiming for a binder appearance, 3x4 as a default?
			const size = getSearchParamAsNumber(url, "size", 12)

			let playerPage = await statsSource.getPage(page, size)

			res.status(200).json({
				links: getLinks(url, page, size, playerPage.totalCount),
				data: playerPage.players,
			})


		} catch (ex) {
			logger.error(ex)
			res.status(500).json({ error: ex })
		}
	})

	router.get("/:playerId", async function(req, res) {
		logger.debug("Get for: " + req.params.playerId)
		let player = await statsSource.getPlayer(req.params.playerId)

		if (!player) {
			res.status(404).json({
				error: { message: "Player not found" }
			})
			return
		}

		res.status(200).json({
			links: {},
			data: player,
		})
	})

	router.get("/:playerId/achievements", async function(req, res) {
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

export default playerRouter
