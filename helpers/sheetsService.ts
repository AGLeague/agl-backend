import DbModel, { Player } from "../models";
import winston from "winston";
import { PartialPlayerNameHelper } from "./names";


interface Players {
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

	private dbToResponse(player: Player): Players {
		let placements = player.placements ?? []
		return {
			name: player.displayName,
			leagues: placements.map(l => l.leagueName),
			stats: {
				leagueCount: placements.length,
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
		let helper = PartialPlayerNameHelper.create(playerName)
		const player = await this._model.findPlayer(helper)

		if (!player)
			return

		return this.dbToResponse(player)
	}
}

export default StatsSource
