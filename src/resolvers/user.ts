import argon2 from "argon2";

import { MyContext } from "src/types";
import { Arg, Ctx, Field, Mutation, ObjectType, Query } from "type-graphql";
import { v4 } from "uuid";
import { COOKIE_NAME, FORGOT_PASSWORD_PREFIX } from "../constants";
import { User } from "../entities/Users";
import { AppDataSource } from "../typeorm-config";
import { sendEmail } from "../utils/email/sendEmail";
import { validateRegister } from "../utils/validateRegister";
import { UsernamePasswordInput } from "./UsernamePasswordInput";

@ObjectType()
// define a custom error containing which field was problematic and a nice message
class MessageField {
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
	@Field(() => [MessageField], { nullable: true })
	errors?: MessageField[];

	@Field(() => [MessageField], { nullable: true })
	success?: MessageField[];

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
		@Arg("options") options: UsernamePasswordInput,
		@Ctx() { req }: MyContext
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
					firstName: options.firstName,
					lastName: options.lastName,
					email: options.email,
					password: hashedPassword,
				})
				.returning("*")
				.execute();
			user = result.raw[0];
		} catch (error) {
			console.log(error.detail);
			// try catch block to handle edge cases such as a user is already registered with the same name
			// error code 23505 means duplicate key exists
			if (error.code === "23505" && error.detail.includes("username")) {
				return {
					errors: [
						{
							field: "username",
							message: "Username already taken",
						},
					],
				};
			}
			if (error.code === "23505" && error.detail.includes("email")) {
				return {
					errors: [
						{
							field: "email",
							message:
								"An account with this email already exists",
						},
					],
				};
			}
		}
		const username =
			user.firstName[0].toUpperCase() + user.firstName.slice(1);
		await sendEmail(
			options.email,
			"PTC Coding Challenge - Account Creation Successful",
			`<html>
			<head>
			  <style>
			  </style>
			</head>
			<body>
			  <p>Hi ${username},</p>
			  <p>Your account creation was successful! </p> 
			  <p> Welcome to the PTC Coding Challenge</p>
			</body>
		  </html>`
		);

		// store userid session which sets the cookie and keeps them logged in
		req.session.userId = user.id;
		return { user };
	}
	@Mutation(() => UserResponse)
	async login(
		@Arg("usernameOrEmail") usernameOrEmail: string,
		@Arg("password") password: string,
		@Ctx() { req }: MyContext
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
						message: "Incorrect username or password",
					},
				],
			};
		}
		req.session.userId = user.id;
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
		console.log(newPassword);
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

		const username =
			user.firstName[0].toUpperCase() + user.firstName.slice(1);
		await sendEmail(
			user.email,
			"PTC Coding Challenge - Password Change Successful",
			`<html>
			<head>
				<style>
				</style>
			</head>
			<body>
				<p>Hi ${username},</p>
				<p>Your password has been changed successfully</p>
			</body>
		</html>`
		);

		return { user };
	}

	@Mutation(() => UserResponse)
	async forgotPassword(
		@Arg("email") email: string,
		@Ctx() { redis }: MyContext
	) {
		const user = await User.findOne({ where: { email } });
		if (!user) {
			// the email is not in the db
			return {
				errors: [
					{
						field: "token",
						message: "Invalid email please try again",
					},
				],
			};
		}
		const token = v4();
		await redis.set(
			FORGOT_PASSWORD_PREFIX + token,
			user.id,
			"EX",
			1000 * 60 * 60 * 24 * 3 // expire after 3 days
		);

		const username =
			user.firstName[0].toUpperCase() + user.firstName.slice(1);
		await sendEmail(
			email,
			"PTC Coding Coding Challenge - Account Password Reset",
			`<html>
				<head>
					<style>
					</style>
				</head>
				<body>
					<p>Hi ${username},</p>
					<p>You requested to reset your password.</p>
					<p> Please click the link below to reset your password.</p>
					<a href="http://localhost:3000/change-password/${token}">Reset PTC account password</a>
				</body>
			</html>`
		);

		return {
			success: [
				{
					field: "idk",
					message: "Email sent! Please check your inbox",
				},
			],
		};
	}
}
