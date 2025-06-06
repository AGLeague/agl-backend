import { google, sheets_v4 } from "googleapis"
import DbModel, { Player } from "../models";
import winston from "winston";

const RECORD_RANGE = "Cumulative Record!E2:I"
const TOP_8_RANGE = "Wins, Top8s, Top16s!D2:F"

const LEAGUE_RANGE = "Players By League"

interface Players {
	name: string;
	leagues: string[],
	stats: {
		leagueCount: number;
		winRate: number;
		top8s: number;
	};
}

function trimPercentSign(arg: string): string {
	if (arg[arg.length - 1] === "%")
		return arg.substring(0, arg.length - 1)
	return arg
}

class SheetsModel {
	private _sheets: sheets_v4.Sheets
	private _sheetId: string

	constructor(apiKey: string, sheetId: string) {
		this._sheets = google.sheets({
			version: "v4",
			auth: apiKey,
		})
		this._sheetId = sheetId
	}

	public async getWinRates(): Promise<{ name: string, winRate: number }[]> {
		const data = await this._sheets.spreadsheets.values.get({
			spreadsheetId: this._sheetId,
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

	public async getTop8s(): Promise<{ name: string, top8s: number }[]> {

		const results = await this._sheets.spreadsheets.values.get({
			spreadsheetId: this._sheetId,
			range: TOP_8_RANGE
		})

		if (!results.data.values)
			throw new Error("Failure getting Top8s")

		return results.data.values.map(row => {
			return { name: row[0], top8s: parseInt(row[1]) }
		})
	}

	public async populateLeagueCount(): Promise<{ leagueName: string, players: string[] }[]> {

		const results = await this._sheets.spreadsheets.values.get({
			spreadsheetId: this._sheetId,
			range: LEAGUE_RANGE,
		})

		if (!results.data.values)
			throw new Error("Failure getting league count")

		let leagues: { leagueName: string, players: string[] }[] = new Array<{ leagueName: string, players: string[] }>()

		for (let column = 0; column < results.data.values[1].length; column++) {
			const leagueName = results.data.values[1][column]

			const players: string[] = []

			let row = 2

			// Each of the columns has various ammounts of data, so use a while loop.
			while (row < results.data.values.length && results.data.values[row][column]) {
				players.push(results.data.values[row][column])
				row++
			}
			leagues[column] = { leagueName: leagueName, players }
		}
		return leagues
	}
}

class StatsSource {
	private _model: DbModel
	private _logger: winston.Logger

	constructor(model: DbModel, logger: winston.Logger) {
		this._model = model
		this._logger = logger
	}

	private dbToResponse(player: Player): Players {
		return {
			name: player.name,
			leagues: player.placements.map(l => l.leagueName),
			stats: {
				leagueCount: player.placements.length,
				winRate: player.winRate,
				top8s: player.top8s,
			}
		}
	}

	public async getPage(page: number, size: number): Promise<{ players: Players[], totalCount: number }> {

		const response = await this._model.getPlayersPage(page, size)
		this._logger.info(response.players[0])

		this._logger.info("Get Page has " + response.players.length + " rows")
		return { players: response.players.map(this.dbToResponse), totalCount: response.totalCount }
	}

	public async getPlayer(playerName: string): Promise<Players | undefined> {
		const player = await this._model.getPlayer(playerName)

		if (!player)
			return

		return this.dbToResponse(player)
	}
}

export { SheetsModel }
export default StatsSource
