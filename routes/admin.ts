import { Router, json } from "express";
import DbModel from "../models";
import { SheetReaderFactory } from "../sheets/leagueSheet";
import winston from "winston"

import aliasData from "../data/names.json"
import leagueData from "../data/leagues.json"
import { NoMatchedError, NotUniqueMatch } from "../exceptions";
import { UniqueConstraintError } from "sequelize";
import { FullPlayerNameHelper, NameHelper } from "../helpers/names";

const CURRENT_ACHIEVEMENT_VERSION = 0

interface PlayerAlias {
	preferredName: string
	names: string[]
	arenaIds?: string[]
}

interface LeagueInfo {
	code: string
	name?: string
	year: number
	docId: string
	deathAtLoss: number | null
	noEntropySheet?: boolean
	omwIncludesEntropy?: boolean
	standingsRange?: string
	matchesRange?: string
	achievementVersion?: number
}

function adminRouter(
	sheetReaderFactory: SheetReaderFactory, db: DbModel, logger: winston.Logger, password: string) {
	const router = Router()

	// Admin routes require auth.
	router.use((req, res, next) => {
		if (!password) {
			// If the instance is not setup right, don't allow requests without a password
			logger.warn("Admin route requested without a password")
			res.status(500).json({ error: "Bad Config" })
		} else if (req.query.password !== password) {
			logger.error("Admin route requested with an invalid password")
			res.status(401).json({ error: "Unauthorized" })
			return
		} else {
			next()
		}
	})

	function findMatchingLeagueInfo(leagueInfos: LeagueInfo[], leagueName: string) {
		let leagueInfo = leagueInfos.filter(l => l.code === leagueName || l.name === leagueName)
		if (leagueInfo.length > 1) {
			throw new NotUniqueMatch("League info was not unique for " + leagueName)
		}
		return leagueInfo[0] ?? null
	}

	async function createLeague(leagueInfo: LeagueInfo | null, leagueName: string): Promise<string> {
		let code = leagueInfo?.code ?? leagueName
		try {
			if (leagueInfo) {
				await db.createLeague(
					leagueInfo.code,
					leagueInfo.name,
					leagueInfo.year,
					leagueInfo.docId,
					leagueInfo.deathAtLoss,
					leagueInfo.noEntropySheet,
					leagueInfo.omwIncludesEntropy,
					leagueInfo.standingsRange,
					leagueInfo.matchesRange,
					leagueInfo.achievementVersion ?? CURRENT_ACHIEVEMENT_VERSION,
				)
			} else
				await db.createLeague(leagueName, leagueName)
		} catch (e) {
			if (!(e instanceof UniqueConstraintError))
				throw e
			else
				// We probably hit the endpoint a second time. Not expected, but don't need to fail.
				logger.warn("Unique Constraint Error creating league", { leagueName })
		}
		return code
	}

	async function createLeagueEntry(aliases: PlayerAlias[], name: FullPlayerNameHelper, rank: number, code: string) {
		let player = await db.findPlayer(name)

		if (!player) {
			let alias = findMatchingAlias(aliases, name)
			player = await db.createPlayer(name, getAliasPairs(alias, name.arenaId))
		}
		logger.info("Creating League Entry", { playerId: player.id, rank, code, player, name: name.formattedName })
		await db.upsertLeagueEntry(player.id, code, rank)
	}

	function* getAliasPairs(alias: PlayerAlias, defaultArenaId: string): Generator<{ name: string, arenaId: string }> {
		for (let name of alias.names) {
			if (!alias.arenaIds || !alias.arenaIds.length)
				yield { name: name, arenaId: defaultArenaId }
			else
				for (let arenaId of alias.arenaIds)
					yield { name: name, arenaId: arenaId }
		}
	}

	function findMatchingAlias(aliases: PlayerAlias[], helper: NameHelper): PlayerAlias {
		let { name, arenaId } = helper
		let filteredAliases = aliases;
		if (arenaId)
			filteredAliases = aliases.filter(a => (!a.arenaIds) || a.arenaIds.includes(arenaId))

		filteredAliases = filteredAliases.filter(a => a.names.includes(name))

		if (filteredAliases.length > 1)
			throw new NotUniqueMatch("Did not find unique alias")
		if (filteredAliases.length === 0) {
			if (arenaId)
				return { preferredName: name, names: [name], arenaIds: [arenaId] }
			else
				return { preferredName: name, names: [name], arenaIds: [] }
		} else {
			return filteredAliases[0]
		}
	}

	// TODO: Support these leagues.
	let skipLeagues = [
		"NXT", // Need to add some solution for DRAGON matches
		"DSK"  // Sheets fucked. Miranda J isn't showing up in the rankings
	]

	router.get("/load/init/all", json(), async function(req, res) {

		const sheetReader = sheetReaderFactory.getStatsSheetReader()
		const playersByLeague = await sheetReader.getPlayersByLeague()

		for (let leagueCode of playersByLeague.keys()) {
			if (skipLeagues.includes(leagueCode))
				continue
			try {
				await loadLeague(leagueCode)
			} catch (e) {
				let errResponse = { error: e, leagueCode }
				res.status(400).json(errResponse)
				return
			}
		}
		res.status(200).json({ data: "Successfully added all!" })
	})


	router.get("/load/init/:leagueCode", json(), async function(req, res) {
		let leagueCode = req.params["leagueCode"]
		try {
			await loadLeague(leagueCode)
		} catch (e) {
			let errResponse = { error: e, leagueCode }
			res.status(400).json(errResponse)
			return
		}
		res.status(200).json({ data: "Successfully added " + leagueCode + "!" })
	})

	async function loadLeague(leagueCode: string) {
		logger.info("Got League Code", { leagueCode })
		let leagueInfo = findMatchingLeagueInfo(leagueData, leagueCode)
		leagueCode = await createLeague(leagueInfo, leagueCode)

		const leagueReader = sheetReaderFactory.getLeagueReader(
			leagueInfo?.docId,
			leagueCode,
			leagueInfo?.name ?? leagueCode,
			leagueInfo?.standingsRange,
			leagueInfo?.matchesRange,
		)

		const standings = await leagueReader.getStandings()

		for (let standing of standings) {
			// TODO: Exclude rank if league is in progress.
			await createLeagueEntry(aliasData, standing.player, standing.rank, leagueCode)
		}
		logger.info("Created standings. starting Matches")

		for (let match of await leagueReader.getMatches()) {
			logger.info("Got Match")
			let winnerId: number | null;
			if (match.winner.name.toUpperCase() === "ENTROPY")
				winnerId = null
			else {
				winnerId = await db.newGetPlayer(match.winner, leagueCode)

				if (!winnerId) {
					let error = {
						error: "Could not find winner",
						name: match.winner,
						league: leagueCode
					}
					logger.error(error)
					throw new NoMatchedError("Could not find winner")
				}
			}
			const loserId = await db.newGetPlayer(match.loser, leagueCode)
			if (!loserId) {
				let error = {
					error: "Could not find loser",
					name: match.loser,
					league: leagueCode,
				}
				logger.warn("No loser, continuing", error)
				// There are some users that show up in the matches, but don't seem to show up in teh Player List.
				// Maybe reading from the league sheets instead of the stats sheet will fix this?
				throw new Error("I don't think this should happen")
				// continue
			}
			logger.warn("verified winner/loser")
			const matchModel = {
				// These should all be the same between winner and loser.
				leagueName: leagueCode,
				timestamp: match.timestamp,
				matchScore: match.result,
				winnerId: winnerId,
				opponentId: loserId,
			}
			logger.warn("constructed match")
			await db.createMatch(matchModel)
			logger.warn("saved match")
		}
	}

	return router
}

export { adminRouter }
