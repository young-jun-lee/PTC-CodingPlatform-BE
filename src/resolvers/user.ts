import { User } from "src/entities/User";
import { MyContext } from "src/types";
import { Ctx, Field, ObjectType, Query } from "type-graphql";

@ObjectType()
// define a custom error containing which field was problematic and a nice message
class FieldError {
	@Field()
	field: string;
	@Field()
	message: string;
}

export class UserResolver {
	// Example query to check if user is logged in by checking the cookies
	@Query(() => User, { nullable: true })
	me(@Ctx() { req }: MyContext) {
		// if userID is not set in the session variable ie. a cookie has not been set
		if (!req.session.userId) {
			return null;
		}
		return User.findOne({ where: { id: req.session.userId } });
	}
}
