import "dotenv/config";
import "reflect-metadata";
import cors from "cors";
import express from "express";
import session from "express-session";
import Redis from "ioredis";
import connectRedis from "connect-redis";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { COOKIE_NAME, __prod__ } from "./constants";
import { UserResolver } from "./resolvers/user";
import { AppDataSource } from "./typeorm-config";
import { MyContext } from "./types";
import { SubmissionsResolver } from "./resolvers/submission";
// import { Submissions } from "./entities/Submissions";
// import { User } from "./entities/Users";
const main = async () => {
	const app = express();
	const RedisStore = connectRedis(session);
	const redis = new Redis();
	await AppDataSource.initialize();
	// await User.delete({});
	// await Submissions.delete({});
	await AppDataSource.runMigrations();

	app.set("trust proxy", 1);
	app.use(
		cors({
			origin: [
				"http://localhost:3000",
				"https://studio.apollographql.com",
			],
			credentials: true,
		}),
		session({
			name: COOKIE_NAME,
			store: new RedisStore({
				client: redis,
				disableTouch: true,
			}),
			cookie: {
				maxAge: 1000 * 60 * 60 * 24 * 60, // 2 months
				httpOnly: true,
				sameSite: "lax",
				secure: __prod__, //cookie only works in https
			},
			saveUninitialized: false,
			secret: process.env.SESSION_SECRET as string,
			resave: false,
		})
	);

	const apolloServer = new ApolloServer({
		schema: await buildSchema({
			resolvers: [UserResolver, SubmissionsResolver],
			validate: false,
		}),
		context: ({ req, res }): MyContext => ({
			req,
			res,
			redis,
		}),
	});
	await apolloServer.start();
	apolloServer.applyMiddleware({ app, cors: false });

	app.listen(4000, () => {
		console.log("server started on localhost:4000");
	});
};

main().catch((err) => {
	console.error(err);
});
