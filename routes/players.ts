import { Router } from "express"

import { google } from "googleapis"

import { PaginationLinks, getLinks } from "../helpers/responseHelpers"

const router = Router()

const API_KEY = process.env.API_KEY
const STATS_SHEET_ID = process.env.STATS_SHEET

interface PaginatedResponse<Type> {
	links?: PaginationLinks;
	data: Array<Type>;
}

interface Players {
	name: string;
	stats: {
		leagueCount: number;
		winRate: number;
		top8s: number;
	};
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

router.get("", async function(req, res) {
	const url = new URL(`${req.protocol}://${req.get("host")}${req.originalUrl}`)

	// First page is the default
	const page = getSearchParamAsNumber(url, "page", 1)
	// If we are aiming for a binder appearance, 3x4 as a default?
	const size = getSearchParamAsNumber(url, "size", 12)

	const sheets = google.sheets({
		version: "v4",
		auth: API_KEY,
	})

	const statsSheet = await sheets.spreadsheets.get({
		spreadsheetId: STATS_SHEET_ID,
	})

	if (!statsSheet.data.sheets) {
		res.status(500).json({ status: "Invalid Sheet!" })
		return
	}

	const sheetName = "Cumulative Record"

	const recordSheet = statsSheet.data.sheets.find(
		(sheet) => sheet.properties && sheet.properties.title === sheetName,
	)

	const rowCount = recordSheet?.properties?.gridProperties?.rowCount ?? -1

	// The First row is a header, not a player.
	const playerCount = rowCount - 1

	// TODO: There are lots of empty rows at the bottom that are currently being counted.
	// They mess up the last page link, so figure out what to do about it.

	// TBH, this makes sense to me, but I can't really explain it.
	const startRow = (page - 1) * size + 2
	const endRow = startRow + size - 1

	const range = sheetName + "!E" + startRow + ":I" + endRow

	const results = await sheets.spreadsheets.values.get({
		spreadsheetId: STATS_SHEET_ID,
		range: range,
	})

	const response: PaginatedResponse<Players> = {
		links: getLinks(url, page, size, playerCount),
		data: results.data.values.map((row): Players => {
			return {
				name: row[0],
				stats: {
					leagueCount: -1, // parseFloat(row[4]),
					winRate: parseFloat(trimPercentSign(row[3])),
					// TODO: This one is slightly more complicated
					top8s: -1,
				},
			}
		}),
	}

	res.status(200).json(response)
})

function trimPercentSign(arg: string): string {
	if (arg[arg.length - 1] === "%")
		return arg.substring(0, arg.length - 1)
	return arg
}

export default router
