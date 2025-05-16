import { Router } from "express"

import { google } from "googleapis"

import { PaginationLinks, getLinks } from "../helpers/responseHelpers"
import StatsSource from "../helpers/sheetsService"

const router = Router()

const API_KEY = process.env.API_KEY
const STATS_SHEET_ID = process.env.STATS_SHEET

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

if (!API_KEY)
	throw new Error("Missing API Key")

if (!STATS_SHEET_ID)
	throw new Error("Missing Stats Sheet Id")


const statsSource = new StatsSource(API_KEY, STATS_SHEET_ID)

router.get("", async function(req, res) {
	await statsSource.initialize()

	const url = new URL(`${req.protocol}://${req.get("host")}${req.originalUrl}`)

	// First page is the default
	const page = getSearchParamAsNumber(url, "page", 1)
	// If we are aiming for a binder appearance, 3x4 as a default?
	const size = getSearchParamAsNumber(url, "size", 12)

	let playerPage = statsSource.getPage(page, size)
	res.status(200).json({
		links: getLinks(url, page, size, statsSource.count()),
		data: playerPage,
	})
})

router.get("/:playerId", async function(req, res) {
	await statsSource.initialize()

	const url = new URL(`${req.protocol}://${req.get("host")}${req.originalUrl}`)
	console.log("Get for: " + req.params.playerId)
	let player = statsSource.getPlayer(req.params.playerId)

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

export default router
