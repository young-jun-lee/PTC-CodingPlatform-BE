import "reflect-metadata";
import "dotenv/config";
import { DataSource } from "typeorm";
import { User } from "./entities/User";

require("dotenv").config();

export const AppDataSource = new DataSource({
	type: "postgres",
	database: process.env.DATABASE_NAME,
	username: process.env.USERNAME,
	password: process.env.PASSWORD,
	synchronize: true,
	entities: [User],
});
