class NotUniqueMatch extends Error {
	constructor(msg: string) {
		super(msg)
	}
}

class NoMatchedError extends Error {
	constructor(msg: string) {
		super(msg)
	}
}

class InvalidFormatError extends Error {
	constructor(msg: string) {
		super(msg)
	}
}

export { NotUniqueMatch, NoMatchedError, InvalidFormatError }
