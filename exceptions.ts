class NotUniqueMatch extends Error {
	constructor(msg: string) {
		super(msg)
		this.message = msg
	}
}

class NoMatchedError extends Error {
	constructor(msg: string) {
		super(msg)
		this.message = msg
	}
}

class InvalidFormatError extends Error {
	constructor(msg: string) {
		super(msg)
		this.message = msg
	}
}

export { NotUniqueMatch, NoMatchedError, InvalidFormatError }
