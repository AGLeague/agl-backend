import { DataTypes, HasManySetAssociationsMixin, Model, Op, Sequelize } from "sequelize";
import winston from "winston"

class Player extends Model {
	declare id: number
	declare name: string
	declare winRate: number
	declare top8s: number
	declare placements: LeaguePlacement[]
}

class League extends Model {
	declare id: number
	declare name: string
	declare setLeaguePlacements: HasManySetAssociationsMixin<LeaguePlacement, number>
}

class LeaguePlacement extends Model {
	declare id: number
	declare rank: number
	declare player: Player
	declare leagueName: string
}

class DbModel {
	private _db: Sequelize
	private _logger: winston.Logger
	Player: any;
	constructor(db: Sequelize, logger: winston.Logger) {
		this._db = db
		this._logger = logger
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

		LeaguePlacement.init(
			{
				id: {
					type: DataTypes.INTEGER,
					autoIncrement: true,
					primaryKey: true,
				},
				rank: {
					type: DataTypes.INTEGER,
				},
				// declare player: Player
				// declare leagueName: string
			},
			{
				sequelize: this._db,
				modelName: 'leaguePlacements',
			}
		)

		Player.hasMany(LeaguePlacement, { as: 'placements', onDelete: 'CASCADE' })
		LeaguePlacement.belongsTo(Player)

		League.hasMany(LeaguePlacement, { sourceKey: 'name', foreignKey: 'leagueName', onDelete: 'CASCADE' })
		LeaguePlacement.belongsTo(League, { targetKey: 'name', foreignKey: 'leagueName' })

		await this._db.sync()
	}

	public async updatePlayersWinRate(players: { name: string, winRate?: number }[]) {
		await Player.bulkCreate(players, { updateOnDuplicate: ["name", "winRate"] })
	}

	public async updatePlayersTop8s(players: { name: string, top8s?: number }[]) {
		await Player.bulkCreate(players, { updateOnDuplicate: ["name", "top8s"] })
	}

	public async setLeaguePlayers(leagueName: string, players: string[]) {
		const findResult = await League.findOrCreate({ where: { name: leagueName }, include: LeaguePlacement })
		const league = findResult[0]

		let rank = 1
		for (var playerName of players) {
			const [player, _] = await Player.findOrCreate({ where: { name: playerName } })
			this._logger.info({ player })

			const placement = await LeaguePlacement.findOne({ where: { playerId: player.id, leagueName: league.name } })
			if (!placement) {
				this._logger.info(await LeaguePlacement.create({ playerId: player.id, leagueName: league.name, rank: rank }))
			} else if (placement.rank != rank) {
				this._logger.info("Found a placement.")
				placement.rank = rank
				await placement?.save()
			}

			rank = rank + 1
		}

		this._logger.info(league)
	}

	public async getPlayersPage(page: number, size: number): Promise<{ players: Player[], totalCount: number }> {
		// Need to use base 0, instead of 1
		page = page - 1
		let dbResult = await Player.findAndCountAll({ limit: size, offset: page * size, order: [["winrate", "DESC"]], include: 'placements' })

		return { players: dbResult.rows, totalCount: dbResult.count }
	}

	public getPlayer(playerName: string) {
		return Player.findOne({ where: { name: playerName }, include: LeaguePlacement })
	}
}

export { Player }

export default DbModel
