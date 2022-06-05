import argon2 from "argon2";
import { MyContext } from "src/types";
import { Arg, Ctx, Field, Mutation, ObjectType, Query } from "type-graphql";
import { v4 } from "uuid";
import { COOKIE_NAME, FORGOT_PASSWORD_PREFIX } from "../constants";
import { User } from "../entities/Users";
import { AppDataSource } from "../typeorm-config";
import { sendEmail } from "../utils/sendEmail";
import { validateRegister } from "../utils/validateRegister";
import { UsernamePasswordInput } from "./UsernamePasswordInput";

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

	@Mutation(() => Boolean)
	logout(@Ctx() { req, res }: MyContext): Promise<boolean> {
		return new Promise((resolve) =>
			req.session.destroy((err) => {
				res.clearCookie(COOKIE_NAME);
				if (err) {
					console.log(err);
					resolve(false);
					return;
				}
				resolve(true);
			})
		);
	}

	// want to log the user in after changing password, so we pass back a userresponse containing the user
	@Mutation(() => UserResponse)
	async changePassword(
		@Arg("newPassword") newPassword: string,
		@Arg("token") token: string,
		@Ctx() { redis, req }: MyContext
	): Promise<UserResponse> {
		if (newPassword.length <= 3) {
			return {
				errors: [
					{
						field: "newPassword",
						message: "Password length must be greater than 3",
					},
				],
			};
		}
		const key = FORGOT_PASSWORD_PREFIX + token;
		const userId = await redis.get(key);
		if (!userId) {
			return {
				errors: [
					{
						field: "token",
						message: "Token expired",
					},
				],
			};
		}
		// redis stores all of its key-values as strings but our id is a number so we need to convert it
		const userIdNum = parseInt(userId);
		const user = await User.findOne({ where: { id: userIdNum } });

		if (!user) {
			return {
				errors: [
					{
						field: "token",
						message: "User no longer exists",
					},
				],
			};
		}
		User.update(
			{ id: userIdNum },
			{ password: await argon2.hash(newPassword) }
		);

		// log in user after changing password
		req.session.userId = user.id;

		// clear the redis key so that the link can't be used again to change password
		await redis.del(key);
		return { user };
	}

	@Mutation(() => Boolean)
	async forgotPassword(
		@Arg("email") email: string,
		@Ctx() { redis }: MyContext
	) {
		const user = await User.findOne({ where: { email } });
		if (!user) {
			// the email is not in the db
			return true;
		}
		const token = v4();
		await redis.set(
			FORGOT_PASSWORD_PREFIX + token,
			user.id,
			"EX",
			1000 * 60 * 60 * 24 * 3 // expire after 3 days
		);

		await sendEmail(
			email,
			`<a href="http://localhost:3000/change-password/${token}">reset password</a>`
		);

		return true;
	}
}
