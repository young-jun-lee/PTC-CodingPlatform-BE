import "reflect-metadata";
import { __prod__ } from "./constants";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { UserResolver } from "./resolvers/user";
import { MyContext } from "./types";
import cors from "cors";
import { AppDataSource } from "./typeorm-config";

const main = async () => {
	await AppDataSource.initialize();
	const app = express();

	app.set("trust proxy", 1);
	app.use(
		cors({
			origin: [
				"http://localhost:3000",
				"https://studio.apollographql.com",
			],
			credentials: true,
		})
	);

	const apolloServer = new ApolloServer({
		schema: await buildSchema({
			resolvers: [UserResolver],
			validate: false,
		}),
		context: ({ req, res }): MyContext => ({
			req,
			res,
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
