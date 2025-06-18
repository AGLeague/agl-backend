import DbModel, { Player } from "../models";
import winston from "winston";
import { PartialPlayerNameHelper } from "./names";


interface Players {
	id: number;
	name: string;
	leagues: string[],
	stats: {
		leagueCount: number;
		winRate: number;
		top8s: number;
	};
}


class StatsSource {
	private _model: DbModel
	private _logger: winston.Logger

	constructor(model: DbModel, logger: winston.Logger) {
		this._model = model
		this._logger = logger
	}

	private dbToResponse = async (player: Player): Promise<Players> => {
		let placements = player.placements ?? []
		let top8s = placements.filter(placements => placements.rank <= 8).length
		let winRate = await this._model.calculateWinRate(player.id)

		return {
			id: player.id,
			name: player.displayName,
			leagues: placements.map(l => l.leagueName),
			stats: {
				leagueCount: placements.length,
				winRate,
				top8s
			}
		}
	}

	public async getPage(page: number, size: number): Promise<{ players: Players[], totalCount: number }> {

		const response = await this._model.getPlayersPage(page, size)

		this._logger.info("Got Page", { pageLength: response.players.length, totalCount: response.totalCount })

		const players = await Promise.all(response.players.map(this.dbToResponse))

		return { players, totalCount: response.totalCount }
	}

	public async getPlayer(playerName: string): Promise<Players | undefined> {
		let helper = PartialPlayerNameHelper.create(playerName)
		const player = await this._model.findPlayer(helper)

		if (!player)
			return

		return this.dbToResponse(player)
	}

	public async getNames() {
		const names: string[] = await this._model.getPlayerNames()
		return names
	}
}

export default StatsSource
