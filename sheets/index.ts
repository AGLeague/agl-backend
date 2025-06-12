import { Logger } from "winston"
import { InvalidFormatError } from "../exceptions"

class SheetDataHelper implements Iterable<Row> {
	private _data: string[][]
	private _logger?: Logger
	private _headerIndicies: Map<string, number>

	constructor(data: string[][], options?: { logger: Logger }) {
		const { logger } = { ...options }
		this._logger = logger
		const headerRow = data[0]
		const headerIndicies = new Map<string, number>()
		headerRow.forEach((value, index) => {
			headerIndicies.set(value, index)
		})
		this._headerIndicies = headerIndicies

		// First row was the header, so don't need it in the data.
		this._data = data.slice(1)
	}

	*generateRows(): IterableIterator<Row> {
		for (let rowData of this._data) {
			this._logger?.info("Generating row", { data: rowData })
			const helper = new SheetRowHelper(this._headerIndicies, rowData)
			const playerName = helper.getOptionalColumnByHeader("PLAYER NAME")
			this._logger?.info({ playerName })
			if (playerName && playerName.toUpperCase() === "ENTROPY") {
				this._logger?.info("Found entropy row")
				break
			}

			if (!helper.isEmpty())
				yield helper
		}
	}

	[Symbol.iterator] = this.generateRows
}

interface Row {
	getColumnByHeader(name: string): string
	getOptionalColumnByHeader(name: string): string | null
}

function replacer<K, V>(key: K, value: V) {
	if (value instanceof Map) {
		return Array.from(value.entries()) // or with spread: value: [...value]
	} else {
		return value;
	}
}

class SheetRowHelper implements Row {
	private _headerIndicies: Map<string, number>
	private _rowData: string[]

	constructor(headerIndicies: Map<string, number>, rowData: string[]) {
		this._headerIndicies = headerIndicies
		this._rowData = rowData
	}

	getColumnByHeader(name: string): string {
		const index = this._headerIndicies.get(name)

		if (!index && index !== 0)
			throw new InvalidFormatError("Sheet is missing a header. Needed: " + name + " Had: " + JSON.stringify(this._headerIndicies, replacer))

		if (this._rowData.length < index)
			throw new InvalidFormatError("Row had to few columns. Needed: " + index + " Had: " + this._rowData.length)

		return this._rowData[index]
	}

	getOptionalColumnByHeader(name: string): string | null {
		const index = this._headerIndicies.get(name)

		if (index === undefined)
			return null

		if (this._rowData.length < index)
			throw new InvalidFormatError("Row had to few columns. Needed: " + index + " Had: " + this._rowData.length)

		return this._rowData[index]
	}

	isEmpty(): boolean {
		for (let cell of this._rowData) {
			if (!cell || cell === "#N/A")
				continue
			return false
		}
		return true
	}
}

export { SheetDataHelper, Row }
