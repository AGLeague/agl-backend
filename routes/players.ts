import { Router } from "express"

import { getLinks } from "../helpers/responseHelpers"
import StatsSource from "../helpers/sheetsService"
import winston from "winston"

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

function playerRouter(statsSource: StatsSource, logger: winston.Logger) {
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

	return router
}

export default playerRouter
