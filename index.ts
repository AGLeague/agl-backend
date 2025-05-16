import express, { Express, Request, Response } from "express"
import cors from "cors"

import playerRoutes from "./routes/players"

const app: Express = express()

app.use(express.json())
app.use(cors())

app.use("/api/players", playerRoutes)

app.get("/", (_: Request, res: Response) => {
	res.send("A placeholder for something cool coming soon")
})

const port = process.env.PORT || 8000

app.listen(port, () => {
	console.log(`App listening on port ${port}`)
})
