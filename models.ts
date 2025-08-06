import { BelongsToGetAssociationMixin, col, CreationAttributes, CreationOptional, DataTypes, fn, ForeignKey, HasManyAddAssociationsMixin, HasManyGetAssociationsMixin, HasManySetAssociationsMixin, InferAttributes, InferCreationAttributes, Model, NonAttribute, QueryTypes, Sequelize, where } from "sequelize";
import winston from "winston"
import { NoMatchedError, NotUniqueMatch } from "./exceptions";
import { FullPlayerNameHelper, NameHelper } from "./helpers/names";

const CURRENT_ACHIEVEMENT_VERSION = 0

class Player extends Model<InferAttributes<Player>, InferCreationAttributes<Player>> {
	declare id: CreationOptional<number>
	declare displayName: string
	declare name: string
	declare arenaId: string
	declare winRate: CreationOptional<number>
	declare top8s: CreationOptional<number>
	declare placements?: NonAttribute<LeagueEntry[]>
	declare getPlacements: HasManyGetAssociationsMixin<LeagueEntry>

	declare getAliases: HasManyGetAssociationsMixin<Alias>
	declare addAlias: HasManyAddAssociationsMixin<Alias, number>
}

class League extends Model<InferAttributes<League>, InferCreationAttributes<League>> {
	declare id: CreationOptional<number>
	declare code: string
	declare name: CreationOptional<string>
	declare year: number | null
	declare docId: string | null
	declare deathAtLoss: number | null
	declare entropySheet: boolean | null
	declare omwIncludesEntropy: boolean | null
	declare standingsRange: string | null
	declare matchesRange: string | null
	declare achievementVersion: number
	declare setLeagueEntries: HasManySetAssociationsMixin<LeagueEntry, number>
}

class LeagueEntry extends Model<InferAttributes<LeagueEntry>, InferCreationAttributes<LeagueEntry>> {
	declare id: CreationOptional<number>
	declare rank: number
	declare playerId: ForeignKey<number>
	declare player?: NonAttribute<Player>
	declare leagueName: ForeignKey<string>
}

class Match extends Model<InferAttributes<Match>, InferCreationAttributes<Match>> {
	declare id: CreationOptional<number>
	declare leagueName: ForeignKey<string>
	declare timestamp: Date
	declare winnerId?: ForeignKey<number | null>
	declare opponentId: ForeignKey<number>
	declare matchScore: string
}

class Alias extends Model<InferAttributes<Alias>, InferCreationAttributes<Alias>> {
	declare id: CreationOptional<number>
	declare playerId: ForeignKey<number>
	declare name: string
	declare arenaId: string
	declare player?: NonAttribute<Player>
	declare getPlayer: BelongsToGetAssociationMixin<Player>
}

interface Achievements {
	playerId: CreationOptional<number>
	progress: number | null
	common: boolean
	uncommon: boolean
	rare: boolean
	mythic: boolean
	spg: boolean
	name: string
	collector: number
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
				displayName: {
					type: DataTypes.STRING,
					allowNull: true,
					unique: true,
				},
				name: {
					type: DataTypes.STRING,
				},
				arenaId: {
					type: DataTypes.STRING,
				},
				winRate: {
					type: DataTypes.DECIMAL,
					allowNull: true,
				},
				top8s: {
					type: DataTypes.INTEGER,
					allowNull: true,
				},
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
				code: {
					type: DataTypes.STRING,
					allowNull: true,
					unique: true,
				},
				year: {
					type: DataTypes.INTEGER,
				},
				docId: {
					type: DataTypes.STRING,
				},
				deathAtLoss: {
					type: DataTypes.INTEGER,
				},
				entropySheet: {
					type: DataTypes.BOOLEAN,
				},
				omwIncludesEntropy: {
					type: DataTypes.BOOLEAN,
				},
				standingsRange: {
					type: DataTypes.STRING,
				},
				matchesRange: {
					type: DataTypes.STRING,
				},
				achievementVersion: {
					type: DataTypes.INTEGER,
					allowNull: false,
				}
			},
			{
				sequelize: this._db,
				modelName: 'league',
			},
		)

		LeagueEntry.init(
			{
				id: {
					type: DataTypes.INTEGER,
					autoIncrement: true,
					primaryKey: true,
				},
				rank: {
					type: DataTypes.INTEGER,
				},
			},
			{
				sequelize: this._db,
				modelName: 'leaguePlacements',
				// TODO: Enforce unique {leageName,usedName} and {leagueName,usedArenaId}
			}
		)

		Match.init(
			{
				id: {
					type: DataTypes.INTEGER,
					autoIncrement: true,
					primaryKey: true,
				},
				timestamp: {
					type: DataTypes.DATE,
				},
				matchScore: {
					type: DataTypes.STRING,
				},
			},
			{
				sequelize: this._db,
			}
		)

		Alias.init(
			{
				id: {
					type: DataTypes.INTEGER,
					autoIncrement: true,
					primaryKey: true,
				},
				name: {
					type: DataTypes.STRING,
				},
				arenaId: {
					type: DataTypes.STRING,
				},
			},
			{
				sequelize: this._db,
			}
		)

		Player.hasMany(LeagueEntry, { as: 'placements', onDelete: 'CASCADE' })
		LeagueEntry.belongsTo(Player)

		League.hasMany(LeagueEntry, { sourceKey: 'code', foreignKey: 'leagueName', onDelete: 'CASCADE' })
		LeagueEntry.belongsTo(League, { targetKey: 'code', foreignKey: 'leagueName' })

		Player.hasMany(Match, {
			as: 'winner', foreignKey: {
				name: 'winnerId', allowNull: true
			}
		})
		Player.hasMany(Match, { as: 'opponent', foreignKey: 'opponentId' })
		Match.belongsTo(Player, { foreignKey: 'winnerId' })
		Match.belongsTo(Player, { foreignKey: 'opponentId' })

		League.hasMany(Match, { sourceKey: 'code', foreignKey: 'leagueName', onDelete: 'CASCADE' })
		Match.belongsTo(League, { targetKey: 'code', foreignKey: 'leagueName' })

		Player.hasMany(Alias)
		Alias.belongsTo(Player)

		await this._db.sync()
	}

	public async getPlayerNames() {
		const results = await Player.findAll({ attributes: ["displayName"] })
		return results.map(player => player.displayName)
	}

	public async createPlayer(name: FullPlayerNameHelper, aliases: Generator<{ name: string, arenaId: string }>) {
		const createdPlayer = await Player.create({ displayName: name.formattedName, name: name.name, arenaId: name.arenaId })

		for (let alias of aliases) {
			this._logger.info("Creating alias", alias)
			await Alias.create({ playerId: createdPlayer.id, name: alias.name, arenaId: alias.arenaId })
		}

		return createdPlayer
	}

	public async addAlias(player: Player, alias: FullPlayerNameHelper) {
		await Alias.create({ playerId: player.id, name: alias.name, arenaId: alias.arenaId })
	}

	public async updatePlayersWinRate(winRates: { name: NameHelper, winRate: number }[]) {
		for (let playerWinRate of winRates) {
			let player = await this.findPlayer(playerWinRate.name)

			if (player === null) {
				throw new NoMatchedError("Player not found: " + playerWinRate.name)
			}

			if (player.winRate !== playerWinRate.winRate) {
				player.winRate = playerWinRate.winRate
				await player.save()
			}
		}
	}

	public async updatePlayersTop8s(top8s: { name: NameHelper, top8s: number }[]) {
		for (let top8Info of top8s) {
			let player = await this.findPlayer(top8Info.name)

			if (player === null) {
				throw new NoMatchedError("Player not found: " + top8Info.name)
			}

			if (player.top8s !== top8Info.top8s) {
				player.top8s = top8Info.top8s
				await player.save()
			}
		}
	}

	public createLeague(
		code: string,
		name: string | undefined,
		year?: number | null,
		docId?: string | null,
		deathAtLoss?: number | null,
		noEntropySheet?: boolean | null,
		omwIncludesEntropy?: boolean | null,
		standingsRange?: string | null,
		matchesRange?: string | null,
		achievementVersion?: number
	) {

		return League.create({
			code,
			name,
			year,
			docId,
			deathAtLoss,
			entropySheet: !noEntropySheet,
			omwIncludesEntropy,
			standingsRange,
			matchesRange,
			achievementVersion: achievementVersion ?? CURRENT_ACHIEVEMENT_VERSION,
		})
	}

	public async upsertLeagueEntry(playerId: number, leagueCode: string, rank: number) {
		const placement = await LeagueEntry.findOne({ where: { playerId: playerId, leagueName: leagueCode } })
		this._logger.warn(placement)
		if (!placement) {
			this._logger.info(await LeagueEntry.create({
				playerId: playerId,
				leagueName: leagueCode,
				rank: rank,
			}))
		} else if (placement.rank != rank) {
			this._logger.info("Found a placement.")
			placement.rank = rank
			await placement?.save()
		}

		return placement
	}

	public async tryFindByArenaId(arenaId: string): Promise<Player | null> {
		const foundAlias = await Player.findAll({
			where:
				where(fn('LOWER', col('Aliases.ArenaId')), '=', arenaId.toLowerCase(),)
			,
			include: [Alias, 'placements']
		})

		if (foundAlias.length === 1)
			return foundAlias[0]
		else if (foundAlias.length > 1) {
			let firstId = foundAlias[0].id

			for (var alias of foundAlias) {
				// We may have found the same alias multiple times. if that's not the case, then it's an error.
				if (alias.id !== firstId)
					throw new NotUniqueMatch("Found multiple matching alias for " + arenaId)
			}
			// If they all have the same Id, they're all the same.
			return foundAlias[0]
		}
		return null
	}


	// TODO: findPlayer, getPlayer, and getPlayerIdByName can probably be combined better, since they are all doing mostly the same thing.
	public async findPlayer(nameHelper: NameHelper): Promise<Player | null> {
		let foundAlias: Player | null = null
		if (nameHelper.arenaId) {
			foundAlias = await this.tryFindByArenaId(nameHelper.arenaId)

		}

		if (foundAlias)
			return foundAlias

		let foundAliases = await Alias.findAll({ where: { name: nameHelper.name, arenaId: nameHelper.arenaId }, include: Player })

		if (foundAliases.length === 1)
			return foundAliases[0].getPlayer({ include: 'placements' })
		else if (foundAliases.length > 1)
			throw new NotUniqueMatch("Found multiple matching alias for " + nameHelper.formattedName)
		return null
	}

	public async newGetPlayer(name: NameHelper, leagueHint: string): Promise<number | null> {
		if (name.name && name.arenaId) {
			const player = await this.findPlayer(name)
			if (!player)
				throw new Error("No Player " + name.formattedName)

			return player.id
		} else if (name.name && leagueHint) {
			return await this.getPlayerIdByName(name.name, leagueHint)
		} else {
			// We might be able to get it off of just the name, but at this point, that shouldn't ever happen.
			// it would be nice to allow just the name in the endpoints if it's not a conflict.
			// TODO: Support this and remove the error.
			throw new Error("Not enough info to find a player")
		}
	}

	public async getPlayersPage(page: number, size: number): Promise<{ players: Player[], totalCount: number }> {
		// Need to use base 0, instead of 1
		page = page - 1
		let dbResult = await Player.findAndCountAll({
			distinct: true,
			limit: size,
			offset: page * size,
			order: [["winrate", "DESC"]],
			include: 'placements'
		}
		)

		return { players: dbResult.rows, totalCount: dbResult.count }
	}

	public async getPlayerIdByName(playerName: string, leagueName: string): Promise<number | null> {

		let result = await this._db.query(`
SELECT
	DISTINCT(leaguePlacements.playerId)
FROM  leaguePlacements
INNER JOIN Players ON leaguePlacements.playerId = players.id
INNER JOIN Aliases ON Aliases.playerId = players.id
WHERE
	leagueName = $league AND Aliases.name = $player
			`,
			{
				bind: { league: leagueName, player: playerName },
				type: QueryTypes.SELECT,
			}
		)

		if (result.length > 1)
			throw new NotUniqueMatch(playerName + "," + leagueName)

		if (result.length == 0)
			return null

		let idResult = (result[0] as any)["playerId"] as string

		return parseInt(idResult)
	}

	public createMatch(match: CreationAttributes<Match>) {
		return Match.create(match, {})
	}

	public upsertLeagueMatches(matches: Array<CreationAttributes<Match>>, leagueCode: string) {
		Match.destroy({
			where: {
				leagueName: leagueCode
			}
		})

		return Match.bulkCreate(matches)
	}

	public async getAchievements(playerId: number) {
		const results = await this._db.query(
			'SELECT * FROM vw_achievements WHERE playerId = $1',
			{
				bind: [playerId],
				type: QueryTypes.SELECT,
			}
		)

		let achievements: Achievements[] = []

		for (let result of results) {
			let anyResult = result as any
			achievements.push({
				playerId: anyResult['playerId'],
				progress: anyResult['progress'],
				common: anyResult['common'],
				uncommon: anyResult['uncommon'],
				rare: anyResult['rare'],
				mythic: anyResult['mythic'],
				spg: anyResult['spg'],
				name: anyResult['name'],
				collector: anyResult['collector']
			})
		}
		return achievements
	}

	public async calculateWinRate(playerId: number): Promise<number> {
		const query = 'SELECT \n' +
			'(SELECT count(*) AS Wins FROM matches WHERE winnerId = $1) as Wins,\n' +
			'(SELECT Count(*) AS Loses FROM Matches where opponentId = $1) as Loses'

		const results = await this._db.query(query,
			{
				bind: [playerId],
				type: QueryTypes.SELECT,
			})
		const onlyResult = results[0] as any
		const wins = onlyResult['Wins']
		const loses = onlyResult['Loses']
		const winRate = wins / (wins + loses)

		return winRate


	}
}

export { Player, Match, LeagueEntry, League, Alias }

export default DbModel
