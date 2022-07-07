import "reflect-metadata";
import "dotenv/config";
import path from "path";
import { DataSource } from "typeorm";
import { User } from "./entities/Users";
import { Submissions } from "./entities/Submissions";
import { DATABASE_URL } from "./constants";

require("dotenv").config();

console.log("database url: ", DATABASE_URL);

export const AppDataSource = new DataSource({
	type: "postgres",
	url: DATABASE_URL,
	synchronize: true,
	ssl: {
		rejectUnauthorized: false,
	},
	migrations: [path.join(__dirname, "./migrations/*")],
	entities: [User, Submissions],
});
