import "reflect-metadata";
import "dotenv/config";
import path from "path";
import { DataSource } from "typeorm";
import { User } from "./entities/Users";
import { Submissions } from "./entities/Submissions";

require("dotenv").config();

export const AppDataSource = new DataSource({
	type: "postgres",
	database: process.env.DATABASE_NAME,
	username: process.env.USERNAME,
	password: process.env.PASSWORD,
	synchronize: true,
	migrations: [path.join(__dirname, "./migrations/*")],
	entities: [User, Submissions],
});
