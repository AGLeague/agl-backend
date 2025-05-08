interface PaginationLinks {
	next?: string;
	last?: string;
	first?: string;
	prev?: string;
	self?: string;
}

function getLinks(
	baseUrl: URL,
	page: number,
	size: number,
	count: number,
): PaginationLinks {
	const pageCount = Math.ceil(count / size)

	const links: PaginationLinks = {
		self: baseUrl.toString(),
	}

	if (page < pageCount) {
		baseUrl.searchParams.set("page", (page + 1).toString())
		links.next = baseUrl.toString()
		baseUrl.searchParams.set("page", pageCount.toString())
		links.last = baseUrl.toString()
	}

	if (page !== 1) {
		baseUrl.searchParams.set("page", (page - 1).toString())
		links.prev = baseUrl.toString()
		baseUrl.searchParams.delete("page")
		links.first = baseUrl.toString()
	}

	return links
}

export { PaginationLinks, getLinks }
