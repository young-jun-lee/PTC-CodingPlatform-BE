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
			"PTC Coding Challenge - Account Password Reset",

			`<!DOCTYPE html>
			<html>
			<head>
			<title></title>
			<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1">
			<meta http-equiv="X-UA-Compatible" content="IE=edge" />
			<style type="text/css">    
				/* CLIENT-SPECIFIC STYLES */
				body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
				table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
				img { -ms-interpolation-mode: bicubic; }
			
				/* RESET STYLES */
				img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
				table { border-collapse: collapse !important; }
				body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
			
				/* iOS BLUE LINKS */
				a[x-apple-data-detectors] {
					color: inherit !important;
					text-decoration: none !important;
					font-size: inherit !important;
					font-family: inherit !important;
					font-weight: inherit !important;
					line-height: inherit !important;
				}
				
				/* MOBILE STYLES */
				@media screen and (max-width:600px){
					h1 {
						font-size: 32px !important;
						line-height: 32px !important;
					}
				}
			
				/* ANDROID CENTER FIX */
				div[style*="margin: 16px 0;"] { margin: 0 !important; }
			</style>
			
			<style type="text/css">
			
			</style>
			</head>
			<body style="background-color: #f4f4f4; margin: 0 !important; padding: 0 !important;">
			
			<!-- HIDDEN PREHEADER TEXT -->
			<div style="display: none; font-size: 1px; color: #fefefe; line-height: 1px; font-family: Helvetica, Arial, sans-serif; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
				Reset your password
			</div>
			
			<table border="0" cellpadding="0" cellspacing="0" width="100%">
				<!-- LOGO -->
				<tr>
					<td bgcolor="#f4f4f4" align="center">
						<!--[if (gte mso 9)|(IE)]>
						<table align="center" border="0" cellspacing="0" cellpadding="0" width="600">
						<tr>
						<td align="center" valign="top" width="600">
						<![endif]-->
						<table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;" >
							<tr>
								<td align="center" valign="top" style="padding: 40px 10px 40px 10px;">
									<a href="http://rightindem.com" target="_blank">
										<img alt="Logo" src="https://rightindem.com/wp-content/themes/HTML5-Reset-WordPress-Theme-master/images/logo.png" width="169" height="40" style="display: block; width: 169px; max-width: 169px; min-width: 169px; font-family: Helvetica, Arial, sans-serif; color: #ffffff; font-size: 18px;" border="0">
									</a>
								</td>
							</tr>
						</table>
						<!--[if (gte mso 9)|(IE)]>
						</td>
						</tr>
						</table>
						<![endif]-->
					</td>
				</tr>
				<!-- HERO -->
				<tr>
					<td bgcolor="#f4f4f4" align="center" style="padding: 0px 10px 0px 10px;">
						<!--[if (gte mso 9)|(IE)]>
						<table align="center" border="0" cellspacing="0" cellpadding="0" width="600">
						<tr>
						<td align="center" valign="top" width="600">
						<![endif]-->
						<table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;" >
							<tr>
								<td bgcolor="#ffffff" align="center" valign="top" style="padding: 40px 20px 20px 20px; border-radius: 4px 4px 0px 0px; color: #111111; font-family: Helvetica, Arial, sans-serif; font-size: 48px; font-weight: 400; letter-spacing: 4px; line-height: 48px;">
								  <h1 style="font-size: 28px; font-weight: 400; margin: 0; letter-spacing: 0px;">Reset your password</h1>
								</td>
							</tr>
						</table>
						<!--[if (gte mso 9)|(IE)]>
						</td>
						</tr>
						</table>
						<![endif]-->
					</td>
				</tr>
				<!-- COPY BLOCK -->
				<tr>
					<td bgcolor="#f4f4f4" align="center" style="padding: 0px 10px 0px 10px;">
						<!--[if (gte mso 9)|(IE)]>
						<table align="center" border="0" cellspacing="0" cellpadding="0" width="600">
						<tr>
						<td align="center" valign="top" width="600">
						<![endif]-->
						<table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;" >
						  <!-- COPY -->
						  <tr>
							<td bgcolor="#ffffff" align="left" style="padding: 20px 30px 40px 30px; color: #666666; font-family: Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 400; line-height: 25px;" >
							  <p style="margin: 0;">Hello ${username},</p> 
							  <p style="margin: 0;">We've received a request to reset the password for the PTC account associated with: ${email}.</p>
							  <p style="margin: 0;">You can reset your password by clicking the link below:</p>
							  
							</td>
						  </tr>
						  <!-- BULLETPROOF BUTTON -->
						  <tr>
							<td bgcolor="#ffffff" align="left">
							  <table width="100%" border="0" cellspacing="0" cellpadding="0">
								<tr>
								  <td bgcolor="#ffffff" align="center" style="padding: 20px 30px 60px 30px;">
									<table border="0" cellspacing="0" cellpadding="0">
									  <tr>
										  <td align="center" style="border-radius: 3px;" bgcolor="#4A35EA"><a href="http://localhost:3000/change-password/${token}" target="_blank" style="font-size: 20px; font-family: Helvetica, Arial, sans-serif; color: #ffffff; text-decoration: none; color: #ffffff; text-decoration: none; padding: 15px 25px; border-radius: 2px; border: 1px solid #4A35EA; display: inline-block;">Reset Password</a></td>
									  </tr>
									</table>
								  </td>
								</tr>
							  </table>
							</td>
						  </tr>
						  <!-- COPY -->
						  <tr>
							<td bgcolor="#ffffff" align="left" style="padding: 0px 30px 0px 30px; color: #666666; font-family: Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 400; line-height: 25px;" >
							  <p style="margin: 0;">If that doesn't work, copy and paste the following link in your browser:</p>
							</td>
						  </tr>
						  <!-- COPY -->
							<tr>
							  <td bgcolor="#ffffff" align="left" style="padding: 20px 30px 20px 30px; color: #666666; font-family: Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 400; line-height: 25px;" >
								<p style="margin: 0;"><a href="http://localhost:3000/change-password/${token}" target="_blank" style="color: #4A35EA;">http://localhost:3000/change-password/${token}</a></p>
							  </td>
							</tr>
						  <!-- COPY -->
						  <tr>
							<td bgcolor="#ffffff" align="left" style="padding: 0px 30px 20px 30px; color: #666666; font-family: Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 400; line-height: 25px;" >
							  <p style="margin: 0;">If you have any questions, just reply to this email—we're always happy to help out.</p>
							</td>
						  </tr>
						  <!-- COPY -->
						  <tr>
							<td bgcolor="#ffffff" align="left" style="padding: 0px 30px 40px 30px; border-radius: 0px 0px 4px 4px; color: #666666; font-family: Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 400; line-height: 25px;" >
							  <p style="margin: 0;">Cheers,<br>The PTC Coding Challenge Team</p>
							</td>
						  </tr>
						</table>
						<!--[if (gte mso 9)|(IE)]>
						</td>
						</tr>
						</table>
						<![endif]-->
					</td>
				</tr>
				<!-- FOOTER -->
				<tr>
					<td bgcolor="#f4f4f4" align="center" style="padding: 0px 10px 0px 10px;">
						<!--[if (gte mso 9)|(IE)]>
						<table align="center" border="0" cellspacing="0" cellpadding="0" width="600">
						<tr>
						<td align="center" valign="top" width="600">
						<![endif]-->
						<table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;" >
						  <!-- NAVIGATION -->
						  <tr>
							<td bgcolor="#f4f4f4" align="left" style="padding: 30px 30px 30px 30px; color: #666666; font-family: Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 400; line-height: 18px;" >
							  <p style="margin: 0;">
								<a href="https://www.projecttechconferences.com/" target="_blank" style="color: #111111; font-weight: 700;">PTC Website</a> -
								<a href="http://localhost:3000" target="_blank" style="color: #111111; font-weight: 700;">PTC Coding Challenge</a> -
								<a href="https://www.projecttechconferences.com/contact" target="_blank" style="color: #111111; font-weight: 700;">Contact Us</a>
							  </p>
							</td>
						  </tr>
						  <!-- ADDRESS -->
						  <tr>
							<td bgcolor="#f4f4f4" align="left" style="padding: 0px 30px 30px 30px; color: #666666; font-family: Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 400; line-height: 18px;" >
							  <p style="margin: 0;">Charitable Registration No. 771791670 RR 0001</p>
							</td>
						  </tr>
						</table>
						<!--[if (gte mso 9)|(IE)]>
						</td>
						</tr>
						</table>
						<![endif]-->
					</td>
				</tr>
			</table>
				
			</body>
			</html>
			`
			// `<html>
			// 	<head>
			// 		<style>
			// 		</style>
			// 	</head>
			// 	<body>
			// 		<p>Hello ${username},</p>
			// 		<p>We've received a request to reset the password for the PTC account associated with ${email}.</p>
			// 		<p> You can reset your password by clicking the link below:</p>
			// 		<button>Reset your password					<a href="http://localhost:3000/change-password/${token}">Reset PTC account password</a>
			// 		</button>
			// 	</body>
			// </html>`
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
