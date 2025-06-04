import { DataTypes, HasManySetAssociationsMixin, Model, Op, Sequelize } from "sequelize";

class Player extends Model {
	declare id: number;
	declare name: string;
	// declare leagueCount: string; // Can be calculated from league table.
	declare winRate: number;
	declare top8s: number;
	declare leagues: League[]
}

class League extends Model {
	declare id: number;
	declare name: string;
	declare players: Player[]
	declare setPlayers: HasManySetAssociationsMixin<Player, number>
}

/*
class Stat extends Model {
	declare id: number;
	// declare leagueCount: string; // Can be calculated from league table.
	declare winRate: number;
	declare top8s: number;
}
*/


class DbModel {
	private _db: Sequelize
	Player: any;
	constructor(db: Sequelize) {
		this._db = db
		// this.Player = db.define('Player', {})

	}

	public async initialize() {
		Player.init(
			{
				id: {
					type: DataTypes.INTEGER,
					autoIncrement: true,
					primaryKey: true,
				},
				name: {
					type: DataTypes.STRING,
					allowNull: true,
					unique: true,
				},
				winRate: {
					type: DataTypes.DECIMAL,
					allowNull: true,
				},
				top8s: {
					type: DataTypes.INTEGER,
					allowNull: true,
				}
			},
			{
				sequelize: this._db,
				modelName: 'player',
			},
		)

		League.init(
			{
				id: {
					type: DataTypes.INTEGER,
					autoIncrement: true,
					primaryKey: true,
				},
				name: {
					type: DataTypes.STRING,
					allowNull: true,
					unique: true,
				},
			},
			{
				sequelize: this._db,
				modelName: 'league',
			},
		)

		Player.belongsToMany(League, { through: 'playerLeagues' })
		League.belongsToMany(Player, { through: 'playerLeagues' })

		await this._db.sync()
	}

	public async updatePlayersWinRate(players: { name: string, winRate?: number }[]) {
		await Player.bulkCreate(players, { updateOnDuplicate: ["name", "winRate"] })
	}

	public async updatePlayersTop8s(players: { name: string, top8s?: number }[]) {
		await Player.bulkCreate(players, { updateOnDuplicate: ["name", "top8s"] })
	}

	public async setLeaguePlayers(leagueName: string, players: string[]) {
		let foundPlayers = await Player.bulkCreate(players.map(name => ({ name })), { updateOnDuplicate: ["name"] })

		foundPlayers = await Player.findAll({ where: { name: { [Op.in]: players } } })

		const findResult = await League.findOrCreate({ where: { name: leagueName }, include: Player })
		const league = findResult[0]
		await league.setPlayers(foundPlayers)
	}

	public async getPlayersPage(page: number, size: number): Promise<{ players: Player[], totalCount: number }> {
		// Need to use base 0, instead of 1
		page = page - 1
		let dbResult = await Player.findAndCountAll({ limit: size, offset: page * size, order: [["winrate", "DESC"]], include: League })

		return { players: dbResult.rows, totalCount: dbResult.count }
	}

	public getPlayer(playerName: string) {
		return Player.findOne({ where: { name: playerName }, include: League })
	}
}

export { Player }

export default DbModel
