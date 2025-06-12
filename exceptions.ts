class NotUniqueMatch extends Error {
	constructor(msg: string) {
		super(msg)

		// Set the prototype explicitly.
		Object.setPrototypeOf(this, NotUniqueMatch.prototype);
	}
}

class NoMatchedError extends Error {
	constructor(msg: string) {
		super(msg)

		// Set the prototype explicitly.
		Object.setPrototypeOf(this, NoMatchedError.prototype);
	}
}

class InvalidFormatError extends Error {
	constructor(msg: string) {
		super(msg)

		// Set the prototype explicitly.
		Object.setPrototypeOf(this, NoMatchedError.prototype);
	}
}

export { NotUniqueMatch, NoMatchedError, InvalidFormatError }
