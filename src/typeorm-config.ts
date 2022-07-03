import "reflect-metadata";
import "dotenv/config";
import path from "path";
import { DataSource } from "typeorm";
import { User } from "./entities/Users";
import { Submissions } from "./entities/Submissions";

require("dotenv").config();

// export const AppDataSource = new DataSource({
// 	type: "postgres",
// 	database: process.env.DATABASE_NAME,
// 	username: process.env.USERNAME,
// 	password: process.env.PASSWORD,
// 	synchronize: true,
// 	migrations: [path.join(__dirname, "./migrations/*")],
// 	entities: [User, Submissions],
// });

// prod
export const AppDataSource = new DataSource({
	type: "postgres",
	// database: process.env.HEROKU_DATABASE,
	// username: process.env.HEROKU_USERNAME,
	// password: process.env.HEROKU_PASSWORD,
	// host: process.env.HEROKU_HOST,
	url: process.env.DATABASE_URL,
	synchronize: true,
	ssl: {
		rejectUnauthorized: false,
	},
	migrations: [path.join(__dirname, "./migrations/*")],
	entities: [User, Submissions],
});
