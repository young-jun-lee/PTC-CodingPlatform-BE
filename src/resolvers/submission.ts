import { Submissions } from "../entities/Submissions";
import { MyContext } from "src/types";
import { Arg, Ctx, Query } from "type-graphql";
import { User } from "../entities/Users";

// @ObjectType()
// // define a custom error containing which field was problematic and a nice message
// class MessageField {
// 	@Field()
// 	field: string;
// 	@Field()
// 	message: string;
// }

// @ObjectType()
// define a custom object type to return for login, which will return either a FieldError or the user
// question mark operator indicates that it is an optional field, so the returned response is an object that
// may include errors and may include a user
// class UserResponse {
// 	@Field(() => [MessageField], { nullable: true })
// 	errors?: MessageField[];

// 	@Field(() => [MessageField], { nullable: true })
// 	success?: MessageField[];

// 	@Field(() => User, { nullable: true })
// 	user?: User;
// }

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

	// @Query(() => Submissions)
	// async userPoints(
	// 	@Arg("username") username: string,
	// 	@Ctx() { req }: MyContext
	// ): Promise<Submissions> {
	// 	const points = await Submission.find();
	// }

	@Query(() => [Submissions], { nullable: true })
	async userPoints(
		@Arg("username") username: string
	): Promise<Submissions[] | null> {
		return Submissions.find({ where: { username: username } });
	}
}
