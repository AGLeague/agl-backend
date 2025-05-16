import { google, sheets_v4 } from "googleapis"

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

class StatsSource {
	private _players: Players[] | null
	private _playersIndex: Map<string, Players>
	private _sheets: sheets_v4.Sheets
	private _sheetId: string

	constructor(apiKey: string, sheetId: string) {
		this._players = null
		this._sheets = google.sheets({
			version: "v4",
			auth: apiKey,
		})
		this._sheetId = sheetId
		this._playersIndex = new Map<string, Players>()
	}

	public getPage(page: number, size: number): Players[] {
		const startRow = (page - 1) * size
		const endRow = startRow + size

		if (!this._players) {
			throw new Error("Players were not initialized.")
		}

		return this._players.slice(startRow, endRow)
	}

	public count() {
		if (!this._players) {
			throw new Error("Players were not initialized.")
		}
		return this._players?.length
	}

	public async initialize(force: boolean = false) {
		// Don't need to reinitialize everytime
		if (this._players && !force)
			return
		else if (force)
			this._playersIndex = new Map()

		this._players = await this.getPlayers()
		await this.populateTop8s()
		await this.populateLeagueCount()
	}

	private async getPlayers(): Promise<Players[]> {
		const data = await this._sheets.spreadsheets.values.get({
			spreadsheetId: this._sheetId,
			range: RECORD_RANGE
		})

		if (!data.data.values)
			throw new Error("Failure")

		const players = data.data.values.map((row) => {
			return {
				name: row[0],
				leagues: [],
				stats: {
					leagueCount: 0,
					winRate: parseFloat(trimPercentSign(row[3])),
					top8s: 0,
				}
			}
		})

		for (const player of players) {
			this._playersIndex.set(player.name, player)
		}

		return players
	}

	private async populateTop8s() {
		if (!this._players)
			throw new Error("Cannot populate top 8s if players have not been initialized.")

		const results = await this._sheets.spreadsheets.values.get({
			spreadsheetId: this._sheetId,
			range: TOP_8_RANGE
		})

		if (!results.data.values)
			throw new Error("Failure getting Top8s")

		for (const result of results.data.values) {
			if (!result[0])
				continue
			let player = this._playersIndex.get(result[0])
			if (!player) {
				// TODO: Should find a better way to do logging at various levels
				console.log("Found unrecognized player in top 8s: " + result[0])
			} else {
				player.stats.top8s = parseInt(result[1])
			}
		}
	}

	private async populateLeagueCount() {
		if (!this._players)
			throw new Error("Cannot populate league count if players have not been initialized.")

		const results = await this._sheets.spreadsheets.values.get({
			spreadsheetId: this._sheetId,
			range: LEAGUE_RANGE,
		})

		if (!results.data.values)
			throw new Error("Failure getting league count")

		console.log(results.data.values[1])

		for (let column = 0; column < results.data.values[1].length; column++) {
			const leagueName = results.data.values[1][column]
			console.log("Counting for " + leagueName)

			let row = 2

			// Each of the columns has various ammounts of data, so use a while loop.
			while (row < results.data.values.length && results.data.values[row][column]) {
				const player = this._playersIndex.get(results.data.values[row][column])
				if (!player) {
					// TODO: Should find a better way to do logging at various levels
					console.log("Found unrecognized player in league count: " + results.data.values[row][column])
					row++
					continue
				}
				player.stats.leagueCount = player.stats.leagueCount + 1
				player.leagues.push(leagueName)
				console.log(player.leagues)
				row++
			}
		}
	}
}

export default StatsSource
