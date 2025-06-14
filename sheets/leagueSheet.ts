import { google, sheets_v4 } from "googleapis"
import winston from "winston"
import { Row, SheetDataHelper } from "."
import { FullPlayerNameHelper, NameHelper, PartialPlayerNameHelper } from "../helpers/names"

const RECORD_RANGE = "Cumulative Record!E2:I"
const TOP_8_RANGE = "Wins, Top8s, Top16s!D2:F"
const LEAGUE_RANGE = "Players By League"
const MATCH_RANGE = "Matches KLR-Present!A2:M"


interface Standing {
	readonly player: FullPlayerNameHelper,
	readonly rank: number,
	readonly opponentMatchWinRate?: number
}

function rowToStanding(row: Row): Standing {
	// Trim the trailing %
	let omw = row.getOptionalColumnByHeader("OMW%")
	if (omw) {
		omw = omw.split('%')[0]

		return {
			player: new FullPlayerNameHelper(
				row.getColumnByHeader("PLAYER NAME"),
				row.getColumnByHeader("ARENA ID"),
			),
			rank: parseInt(row.getColumnByHeader("RANK")),
			opponentMatchWinRate: parseFloat(omw)
		}
	}
	return {
		player: new FullPlayerNameHelper(
			row.getColumnByHeader("PLAYER NAME"),
			row.getColumnByHeader("ARENA ID"),
		),
		rank: parseInt(row.getColumnByHeader("RANK")),
	}
}

interface SheetMatch {
	readonly winner: NameHelper
	readonly loser: NameHelper
	readonly timestamp: Date
	readonly result: string
}

function rowToMatch(row: Row): SheetMatch {
	return {
		winner: PartialPlayerNameHelper.create(row.getColumnByHeader("Winner Name")),
		loser: PartialPlayerNameHelper.create(row.getColumnByHeader("Loser Name")),
		timestamp: new Date(row.getColumnByHeader("Timestamp")),
		result: row.getColumnByHeader("Result"),
	}
}

interface LeagueReader {
	getStandings(): Promise<Standing[]>

	getMatches(): Promise<SheetMatch[]>
}


// If I upgrade to node 22, I can use [this](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Iterator/toArray) instead
function toArray<T>(iterator: Iterator<T>): T[] {
	let array: T[] = []
	let result = iterator.next()
	while (!result.done) {
		array.push(result.value)

		result = iterator.next()
	}

	return array
}

class MatchRowHelper {
	private _row: string[]

	private static MATCH_CODE_INDEX = 0
	get code() {
		return this._row[MatchRowHelper.MATCH_CODE_INDEX]
	}

	static MATCH_FORMAT_INDEX = 1
	get format() {
		return this._row[MatchRowHelper.MATCH_FORMAT_INDEX]
	}

	static MATCH_TIME_INDEX = 3
	get time() {
		return new Date(this._row[MatchRowHelper.MATCH_TIME_INDEX])
	}

	static MATCH_PLAYER_INDEX = 4
	get player() {
		return this._row[MatchRowHelper.MATCH_PLAYER_INDEX]
	}

	static MATCH_RESULT_INDEX = 5
	get result() {
		return this._row[MatchRowHelper.MATCH_RESULT_INDEX]
	}

	static MATCH_SCORE_INDEX = 10
	get score() {
		return this._row[MatchRowHelper.MATCH_SCORE_INDEX]
	}

	static MATCH_RESULT_WIN = "Win"
	get isWin() {
		return this.result == MatchRowHelper.MATCH_RESULT_WIN
	}
	static MATCH_RESULT_LOSS = "Loss"
	get isLoss() {
		return this.result == MatchRowHelper.MATCH_RESULT_LOSS
	}

	static EXPECTED_LENGTH = 13
	constructor(row: string[]) {
		if (row.length < MatchRowHelper.EXPECTED_LENGTH)
			throw new Error("Missing Match data. Expected length of " + MatchRowHelper.EXPECTED_LENGTH + ", got length of " + row.length)
		this._row = row
	}

	public merge(other: MatchRowHelper): SheetMatch {
		let winHelper: MatchRowHelper
		let lossHelper: MatchRowHelper

		if (this.isWin) {
			if (!other.isLoss)
				throw Error("Match " + this.code + " did not have 1 win and 1 loss")
			winHelper = this
			lossHelper = other
		} else if (this.isLoss) {
			if (!other.isWin)
				throw Error("Match " + this.code + " did not have 1 win and 1 loss")
			lossHelper = this
			winHelper = other
		} else {
			throw Error("Match " + this.code + " did not have 1 win and 1 loss")
		}

		return {
			winner: PartialPlayerNameHelper.create(winHelper.player),
			loser: PartialPlayerNameHelper.create(lossHelper.player),
			timestamp: winHelper.time,
			result: winHelper.result,
		}
	}
}

function trimPercentSign(arg: string): string {
	if (arg[arg.length - 1] === "%")
		return arg.substring(0, arg.length - 1)
	return arg
}

class StatsSheetReader {
	private _sheets: sheets_v4.Sheets
	private _logger: winston.Logger
	private _statsSheetId: string

	constructor(sheets: sheets_v4.Sheets, logger: winston.Logger, statsSheetId: string) {
		this._sheets = sheets
		this._logger = logger
		this._statsSheetId = statsSheetId
	}

	async getPlayersByLeague(): Promise<Map<string, FullPlayerNameHelper[]>> {

		this._logger.info("getPlayersByLeague")

		const results = await this._sheets.spreadsheets.values.get({
			spreadsheetId: this._statsSheetId,
			range: LEAGUE_RANGE,
			majorDimension: 'COLUMNS'
		})

		if (!results.data.values)
			throw new Error("Failure getting leagues")

		let playersByLeague = new Map<string, FullPlayerNameHelper[]>()

		for (let col of results.data.values) {
			if (col.length < 1)
				throw new Error("Not enough rows")

			playersByLeague.set(col[1], col.slice(2).map(name => FullPlayerNameHelper.create(name)))
		}
		return playersByLeague
	}

	async getMatchesForLeague(leagueCode: string) {
		const results = await this._sheets.spreadsheets.values.get({
			spreadsheetId: this._statsSheetId,
			range: MATCH_RANGE,
		})

		if (!results.data.values) {
			throw new Error("Failure getting matches")
		}

		let matches: SheetMatch[] = []
		let matchByCode: Map<string, MatchRowHelper> = new Map<string, MatchRowHelper>()
		let seenMatchCodes: Set<string> = new Set<string>()

		for (let row = 0; row < results.data.values.length; row++) {
			let sheetMatch = new MatchRowHelper(results.data.values[row])

			if (leagueCode && sheetMatch.format != leagueCode) {
				// Allow to filter to just one league
				continue
			}

			var otherHelper = matchByCode.get(sheetMatch.code)

			if (seenMatchCodes.has(sheetMatch.code)) {
				throw new Error("Extra entry for " + sheetMatch.code)
			}

			if (!otherHelper) {
				matchByCode.set(sheetMatch.code, sheetMatch)
				continue
			}

			let match = sheetMatch.merge(otherHelper)
			matches.push(match)

			matchByCode.delete(sheetMatch.code)
			seenMatchCodes.add(sheetMatch.code)
		}

		if (matchByCode.size)
			throw new Error(matchByCode.size + " extra half matches")
		return matches
	}

	public async getWinRates(): Promise<{ name: NameHelper, winRate: number }[]> {
		const data = await this._sheets.spreadsheets.values.get({
			spreadsheetId: this._statsSheetId,
			range: RECORD_RANGE
		})

		if (!data.data.values)
			throw new Error("Failure")

		const players = data.data.values.map((row) => {
			return {
				name: row[0],
				winRate: parseFloat(trimPercentSign(row[3])),
			}
		})

		return players
	}

	public async getTop8s(): Promise<{ name: NameHelper, top8s: number }[]> {

		const results = await this._sheets.spreadsheets.values.get({
			spreadsheetId: this._statsSheetId,
			range: TOP_8_RANGE
		})

		if (!results.data.values)
			throw new Error("Failure getting Top8s")

		return results.data.values.map(row => {
			return { name: row[0], top8s: parseInt(row[1]) }
		})
	}

}

class StatsSheetLeagueReader implements LeagueReader {
	private _leagueCode: string
	private _statsReader: StatsSheetReader
	private _logger: winston.Logger

	constructor(leagueCode: string, statsReader: StatsSheetReader, logger: winston.Logger) {
		this._leagueCode = leagueCode
		this._statsReader = statsReader
		this._logger = logger
	}

	async getStandings(): Promise<Standing[]> {
		this._logger.info("Getting Standings B")
		const playersByLeague = await this._statsReader.getPlayersByLeague()
		const players = playersByLeague.get(this._leagueCode) ?? []
		const standings: Standing[] = []
		let rank = 1
		for (let player of players) {
			standings.push({
				player: player,
				rank,
			})
			rank = rank + 1
		}
		return standings
	}

	getMatches(): Promise<SheetMatch[]> {
		return this._statsReader.getMatchesForLeague(this._leagueCode)
	}
}

class LeagueSheetReader implements LeagueReader {

	private _sheets: sheets_v4.Sheets
	private _logger: winston.Logger
	private _sheetId: string
	private _standingsRange: string
	private _matchesRange: string
	private static DEFAULT_STANDINGS_RANGE = "Standings!A5:10000"
	private static DEFAULT_MATCH_RANGE = "Matches!A:Z"

	constructor(sheets: sheets_v4.Sheets, logger: winston.Logger, sheetId: string, standingsRange: string | undefined, matchesRange: string | undefined) {
		this._sheets = sheets
		this._logger = logger
		this._sheetId = sheetId
		this._standingsRange = standingsRange ?? LeagueSheetReader.DEFAULT_STANDINGS_RANGE
		this._matchesRange = matchesRange ?? LeagueSheetReader.DEFAULT_MATCH_RANGE
	}

	async getStandings(): Promise<Standing[]> {
		this._logger.info("Getting Standings A", { range: this._standingsRange })
		const results = await this._sheets.spreadsheets.values.get({
			spreadsheetId: this._sheetId,
			range: this._standingsRange,
		})

		if (!results.data.values)
			throw new Error("Failure getting Top8s")

		this._logger.info({ sheetId: this._sheetId, data: results.data.values })

		let helper = new SheetDataHelper(results.data.values, { logger: this._logger.child({ service: "DataHelper" }) })

		let atEnd = false

		const standings: Standing[] = []
		for (let row of helper.generateRows()) {
			const playerName = row.getOptionalColumnByHeader("PLAYER NAME")
			this._logger?.info({ playerName })
			if (playerName && playerName.toUpperCase() === "ENTROPY") {
				this._logger?.info("Found entropy row")
				break
			}

			if (!row.isEmpty())
				standings.push(rowToStanding(row))
		}
		return standings
	}

	async getMatches(): Promise<SheetMatch[]> {
		const results = await this._sheets.spreadsheets.values.get({
			spreadsheetId: this._sheetId,
			range: this._matchesRange,
		})

		if (!results.data.values)
			throw new Error("Failure getting Top8s")

		let helper = new SheetDataHelper(results.data.values, { logger: this._logger.child({ service: "DataHelper" }) })

		let matches: SheetMatch[] = []
		for (var row of helper) {
			if (row.isEmpty())
				continue

			// Some sheets have hidden rows at the start.
			if (row.getColumnByHeader("Winner Name") === '' && row.getColumnByHeader("Loser Name") === '')
				continue

			matches.push(rowToMatch(row))
		}
		return matches
	}
}

class SheetReaderFactory {
	private _logger: winston.Logger
	private _sheets: sheets_v4.Sheets
	private _statsSheetId: string

	constructor(apiKey: string, logger: winston.Logger, statsSheetId: string) {
		this._sheets = google.sheets({
			version: "v4",
			auth: apiKey
		})
		this._logger = logger
		this._statsSheetId = statsSheetId
	}

	getLeagueReader(sheetId: string, leagueCode: string, leagueName: string, standingsRange: string | undefined, matchRange: string | undefined): LeagueReader {
		let logger = this._logger
		if (leagueName ?? leagueCode)
			logger = logger.child({ "league": leagueName ?? leagueCode })

		if (!sheetId)
			return new StatsSheetLeagueReader(leagueCode, this._getStatsSheetReader(logger), logger)

		this._logger.info("getLeagueReader", { standingsRange })
		return new LeagueSheetReader(this._sheets, logger, sheetId, standingsRange, matchRange)
	}

	getStatsSheetReader() {
		return this._getStatsSheetReader(this._logger)
	}
	private _getStatsSheetReader(logger: winston.Logger) {
		return new StatsSheetReader(this._sheets, logger, this._statsSheetId)
	}
}

export { SheetReaderFactory, LeagueReader, Row }
