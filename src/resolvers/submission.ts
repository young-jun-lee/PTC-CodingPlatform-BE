import { Submissions } from "../entities/Submissions";
import { MyContext } from "../types";
import { Arg, Ctx, Query } from "type-graphql";
import { User } from "../entities/Users";
import { AppDataSource } from "../typeorm-config";

export class SubmissionsResolver {
	// Example query to check if user is logged in by checking the cookies
	@Query(() => User, { nullable: true })
	me(@Ctx() { req }: MyContext) {
		// if userID is not set in the session variable ie. a cookie has not been set
		if (!req.session.userId) {
			return null;
		}
		return User.findOne({ where: { id: req.session.userId } });
	}

	@Query(() => [Submissions], { nullable: true })
	async userPoints(
		@Arg("username") username: string
	): Promise<Submissions[] | null> {
		return Submissions.find({ where: { username: username } });
	}

	@Query(() => [Submissions], { nullable: true })
	async topScores(): Promise<Submissions[] | null> {
		let user;
		try {
			user = await AppDataSource.createQueryBuilder(
				Submissions,
				"submissions"
			)
				.select(["username", "points"])
				.addSelect("rank() over (order by points desc)")
				.orderBy("points", "DESC")
				.limit(10)
				.getRawMany();
			// .execute();
		} catch (error) {
			console.log(error.detail);
		}
		console.log(user);
		return user;
	}
}
