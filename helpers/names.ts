import { InvalidFormatError } from "../exceptions"

interface NameHelper {
	name: string
	arenaId?: string
	formattedName: string
}

/**
 * A NameHelper to be used when we don't know if the arenaId will be
 * included, and should not error if it is not.
**/
class PartialPlayerNameHelper implements NameHelper {
	static SPLITTER = ' - '
	name: string
	arenaId?: string
	constructor(name: string, arenaId: string) {
		this.name = name.trim()
		if (arenaId)
			this.arenaId = arenaId.trim()
		else
			this.arenaId = arenaId
	}

	get formattedName() {
		return this.name + PartialPlayerNameHelper.SPLITTER + this.arenaId
	}

	static create(formattedName: string) {
		const nameParts = formattedName.split(PartialPlayerNameHelper.SPLITTER)
		if (nameParts.length > 2)
			throw new InvalidFormatError(formattedName)

		const [playerName, arenaId] = nameParts

		return new PartialPlayerNameHelper(playerName, arenaId)
	}
}

/**
 * A NameHelper to be used when we expect the arenaId to be
 * included, and should error if it is not.
**/
class FullPlayerNameHelper implements NameHelper {
	static SPLITTER = ' - '
	name: string
	arenaId: string
	constructor(name: string, arenaId: string) {
		this.name = name.trim()
		this.arenaId = arenaId.trim()
	}

	get formattedName() {
		return this.name + FullPlayerNameHelper.SPLITTER + this.arenaId
	}

	static create(formattedName: string) {
		const nameParts = formattedName.split(FullPlayerNameHelper.SPLITTER)
		if (nameParts.length !== 2)
			throw new InvalidFormatError("Expected full format, got " + formattedName)

		const [playerName, arenaId] = nameParts

		return new FullPlayerNameHelper(playerName, arenaId)
	}
}

export { FullPlayerNameHelper, PartialPlayerNameHelper, NameHelper }
