import { User } from "../entities/User";
import { MyContext } from "../types";
import { Arg, Ctx, Field, Mutation, ObjectType, Query } from "type-graphql";
import { validateRegister } from "../utils/validateRegister";
import { UsernamePasswordInput } from "./UsernamePasswordInput";
import { AppDataSource } from "../typeorm-config";
import argon2 from "argon2";

@ObjectType()
// define a custom error containing which field was problematic and a nice message
class FieldError {
	@Field()
	field: string;
	@Field()
	message: string;
}

@ObjectType()
// define a custom object type to return for login, which will return either a FieldError or the user
// question mark operator indicates that it is an optional field, so the returned response is an object that
// may include errors and may include a user
class UserResponse {
	@Field(() => [FieldError], { nullable: true })
	errors?: FieldError[];

	@Field(() => User, { nullable: true })
	user?: User;
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
	// custom query to return a list of all existing users in db
	@Query(() => [User], { nullable: true })
	async listUsers(): Promise<User[] | null> {
		return User.find();
	}

	@Mutation(() => UserResponse)
	async register(
		@Arg("options") options: UsernamePasswordInput
	): Promise<UserResponse> {
		const errors = validateRegister(options);

		if (errors) {
			return { errors };
		}

		// note we don't want to pass through the user's pw as a string, so we hash it first
		const hashedPassword = await argon2.hash(options.password);
		let user;
		try {
			const result = await AppDataSource.createQueryBuilder()
				.insert()
				.into(User)
				.values({
					username: options.username,
					email: options.email,
					password: hashedPassword,
				})
				.returning("*")
				.execute();
			user = result.raw[0];
		} catch (error) {
			// try catch block to handle edge cases such as a user is already registered with the same name
			// error code 23505 means duplicate key exists
			if (error.code === "23505") {
				return {
					errors: [
						{
							field: "username",
							message: "Username already taken",
						},
					],
				};
			}
		}
		return { user };
	}
	@Mutation(() => UserResponse)
	async login(
		@Arg("usernameOrEmail") usernameOrEmail: string,
		@Arg("password") password: string
	): Promise<UserResponse> {
		// check to see if user exists in our db
		// since we're allowing users to login with username or email, if it includes an @ we assume it is an email and set
		// the given value as an email, otherwise as a username
		const user = await User.findOne(
			usernameOrEmail.includes("@")
				? { where: { email: usernameOrEmail } }
				: { where: { username: usernameOrEmail } }
		);
		if (!user) {
			return {
				errors: [
					{
						field: "usernameOrEmail",
						message: "Username doesn't exist",
					},
				],
			};
		}
		const valid = await argon2.verify(user.password, password);
		if (!valid) {
			return {
				errors: [
					{
						field: "password",
						message: "Incorrect Password",
					},
				],
			};
		}
		return { user };
	}
}
