import argon2 from "argon2";

import { MyContext } from "src/types";
import { Arg, Ctx, Mutation, Query } from "type-graphql";
import { v4 } from "uuid";
import { COOKIE_NAME, FORGOT_PASSWORD_PREFIX } from "../constants";
import { User } from "../entities/Users";
import { AppDataSource } from "../typeorm-config";
import { sendEmail } from "../utils/email/sendEmail";
import { validateRegister } from "../utils/validateRegister";
import { UsernamePasswordInput } from "./ResolverTypes";
import { UserResponse } from "./ResolverTypes";

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
		console.log("arrived at listusers function");
		return User.find();
	}

	@Mutation(() => UserResponse)
	async register(
		@Arg("options") options: UsernamePasswordInput,
		@Ctx() { req }: MyContext
	): Promise<UserResponse> {
		console.log("arrived at register function");
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
			`<!DOCTYPE html>
			<html>
				<head>
					<title></title>
					<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
					<meta name="viewport" content="width=device-width, initial-scale=1" />
					<meta http-equiv="X-UA-Compatible" content="IE=edge" />
					<style type="text/css">
						/* CLIENT-SPECIFIC STYLES */
						body,
						table,
						td,
						a {
							-webkit-text-size-adjust: 100%;
							-ms-text-size-adjust: 100%;
						}
						table,
						td {
							mso-table-lspace: 0pt;
							mso-table-rspace: 0pt;
						}
						img {
							-ms-interpolation-mode: bicubic;
						}
			
						/* RESET STYLES */
						img {
							border: 0;
							height: auto;
							line-height: 100%;
							outline: none;
							text-decoration: none;
						}
						table {
							border-collapse: collapse !important;
						}
						body {
							height: 100% !important;
							margin: 0 !important;
							padding: 0 !important;
							width: 100% !important;
						}
			
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
						@media screen and (max-width: 600px) {
							h1 {
								font-size: 32px !important;
								line-height: 32px !important;
							}
						}
			
						/* ANDROID CENTER FIX */
						div[style*="margin: 16px 0;"] {
							margin: 0 !important;
						}
					</style>
			
					<style type="text/css"></style>
				</head>
				<body
					style="
						background-color: #f4f4f4;
						margin: 0 !important;
						padding: 0 !important;
					"
				>
					<!-- HIDDEN PREHEADER TEXT -->
					<div
						style="
							display: none;
							font-size: 1px;
							color: #fefefe;
							line-height: 1px;
							font-family: Helvetica, Arial, sans-serif;
							max-height: 0px;
							max-width: 0px;
							opacity: 0;
							overflow: hidden;
						"
					>
						Reset Password
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
								<table
									border="0"
									cellpadding="0"
									cellspacing="0"
									width="100%"
									style="max-width: 600px"
								>
									<tr>
										<td
											align="center"
											valign="top"
											style="padding: 40px 10px 40px 10px"
										>
											<a
												href="https://www.projecttechconferences.com/"
												target="_blank"
											>
												<img
													alt="Logo"
													src="https://static.wixstatic.com/media/6ec599_870d216ee50e4be8afbba1edafcfe4f3~mv2_d_2048_2048_s_2.png/v1/fill/w_160,h_149,al_c,q_85,usm_0.66_1.00_0.01,enc_auto/PTC%20Logo%20Transparent.png"
													width="169"
													height="40"
													style="
														display: block;
														width: 169px;
														max-width: 169px;
														min-width: 169px;
														font-family: Helvetica, Arial,
															sans-serif;
														color: #ffffff;
														font-size: 18px;
													"
													border="0"
												/>
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
							<td
								bgcolor="#f4f4f4"
								align="center"
								style="padding: 0px 10px 0px 10px"
							>
								<!--[if (gte mso 9)|(IE)]>
									<table align="center" border="0" cellspacing="0" cellpadding="0" width="600">
									<tr>
									<td align="center" valign="top" width="600">
									<![endif]-->
								<table
									border="0"
									cellpadding="0"
									cellspacing="0"
									width="100%"
									style="max-width: 600px"
								>
									<tr>
										<td
											bgcolor="#ffffff"
											align="center"
											valign="top"
											style="
												padding: 40px 20px 20px 20px;
												border-radius: 4px 4px 0px 0px;
												color: #111111;
												font-family: Helvetica, Arial, sans-serif;
												font-size: 48px;
												font-weight: 400;
												letter-spacing: 4px;
												line-height: 48px;
											"
										>
											<h1
												style="
													font-size: 28px;
													font-weight: 400;
													margin: 0;
													letter-spacing: 0px;
												"
											>
												Welcome to the PTC Coding Challenge
											</h1>
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
							<td
								bgcolor="#f4f4f4"
								align="center"
								style="padding: 0px 10px 0px 10px"
							>
								<!--[if (gte mso 9)|(IE)]>
									<table align="center" border="0" cellspacing="0" cellpadding="0" width="600">
									<tr>
									<td align="center" valign="top" width="600">
									<![endif]-->
								<table
									border="0"
									cellpadding="0"
									cellspacing="0"
									width="100%"
									style="max-width: 600px"
								>
									<!-- COPY -->
									<tr>
										<td
											bgcolor="#ffffff"
											align="left"
											style="
												padding: 20px 30px 40px 30px;
												color: #666666;
												font-family: Helvetica, Arial, sans-serif;
												font-size: 18px;
												font-weight: 400;
												line-height: 25px;
											"
										>
											<p style="margin: 0">Hello ${username},</p>
											<p style="margin: 0">
											</br> 
												You have successfully signed up for the PTC
												Coding Challenge. </br> 
												Over the nex 4 weeks,
												you'll have 3 weekly multi-part coding
												problems of varying difficulty to challenge
												yourself with! </br> 
												Learning from our tutorials
												and post-challenge problem solutions is a
												great way to improve your problem-solving
												and coding skills. 
												</br></br> 
												New weekly challenges will be
												released every Monday at 12PM EDT.
												Participant submissions must be submitted before 11:59PM EDT on the following Sunday.
											</p>
											<p style="margin: 0">
												You can read more about the official rules by clicking the link below: 
											</p>
										</td>
									</tr>
									<!-- BULLETPROOF BUTTON -->
									<tr>
										<td bgcolor="#ffffff" align="left">
											<table
												width="100%"
												border="0"
												cellspacing="0"
												cellpadding="0"
											>
												<tr>
													<td
														bgcolor="#ffffff"
														align="center"
														style="padding: 20px 30px 60px 30px"
													>
														<table
															border="0"
															cellspacing="0"
															cellpadding="0"
														>
															<tr>
																<td
																	align="center"
																	style="
																		border-radius: 15px;
																	"
																	bgcolor="#1b9cf7"
																>
																	<a
																		href="https://coding-challenge.projecttechconferences.com/rules"
																		target="_blank"
																		style="
																			font-size: 20px;
																			font-family: Helvetica,
																				Arial,
																				sans-serif;
																			color: #ffffff;
																			text-decoration: none;
																			color: #ffffff;
																			text-decoration: none;
																			padding: 15px
																				40px;
			
																			display: inline-block;
																		"
																		>Rules</a
																	>
																</td>
															</tr>
														</table>
													</td>
												</tr>
											</table>
										</td>
									</tr>
									<!-- COPY -->
									<tr>
										<td
											bgcolor="#ffffff"
											align="left"
											style="
												padding: 0px 30px 0px 30px;
												color: #666666;
												font-family: Helvetica, Arial, sans-serif;
												font-size: 18px;
												font-weight: 400;
												line-height: 25px;
											"
										>
											<p style="margin: 0">
												If that doesn't work, copy and paste the
												following link in your browser:
											</p>
										</td>
									</tr>
									<!-- COPY -->
									<tr>
										<td
											bgcolor="#ffffff"
											align="left"
											style="
												padding: 20px 30px 20px 30px;
												color: #666666;
												font-family: Helvetica, Arial, sans-serif;
												font-size: 18px;
												font-weight: 400;
												line-height: 25px;
											"
										>
											<p style="margin: 0">
												<a
													href="/rules"
													target="_blank"
													style="color: #4a35ea"
													>https://coding-challenge.projecttechconferences.com/rules</a
												>
											</p>
										</td>
									</tr>
									<!-- COPY -->
									<tr>
										<td
											bgcolor="#ffffff"
											align="left"
											style="
												padding: 0px 30px 20px 30px;
												color: #666666;
												font-family: Helvetica, Arial, sans-serif;
												font-size: 18px;
												font-weight: 400;
												line-height: 25px;
											"
										>
											<p style="margin: 0">
												If you have any questions, please send us an email — we're always happy to help out!
											</p>
										</td>
									</tr>
									<!-- COPY -->
									<tr>
										<td
											bgcolor="#ffffff"
											align="left"
											style="
												padding: 0px 30px 40px 30px;
												border-radius: 0px 0px 4px 4px;
												color: #666666;
												font-family: Helvetica, Arial, sans-serif;
												font-size: 18px;
												font-weight: 400;
												line-height: 25px;
											"
										>
											<p style="margin: 0">
												Cheers,<br />The PTC Coding Challenge Team
											</p>
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
							<td
								bgcolor="#f4f4f4"
								align="center"
								style="padding: 0px 10px 0px 10px"
							>
								<!--[if (gte mso 9)|(IE)]>
									<table align="center" border="0" cellspacing="0" cellpadding="0" width="600">
									<tr>
									<td align="center" valign="top" width="600">
									<![endif]-->
								<table
									border="0"
									cellpadding="0"
									cellspacing="0"
									width="100%"
									style="max-width: 600px"
								>
									<!-- NAVIGATION -->
									<tr>
										<td
											bgcolor="#f4f4f4"
											align="left"
											style="
												padding: 30px 30px 30px 30px;
												color: #666666;
												font-family: Helvetica, Arial, sans-serif;
												font-size: 14px;
												font-weight: 400;
												line-height: 18px;
											"
										>
											<p style="margin: 0">
												<a
													href="https://www.projecttechconferences.com/"
													target="_blank"
													style="color: #111111; font-weight: 700"
													>PTC Website</a
												>
												-
												<a
													href="https://coding-challenge.projecttechconferences.com/"
													target="_blank"
													style="color: #111111; font-weight: 700"
													>PTC Coding Challenge</a
												>
												-
												<a
													href="https://www.projecttechconferences.com/contact"
													target="_blank"
													style="color: #111111; font-weight: 700"
													>Contact Us</a
												>
											</p>
										</td>
									</tr>
									<!-- ADDRESS -->
									<tr>
										<td
											bgcolor="#f4f4f4"
											align="left"
											style="
												padding: 0px 30px 30px 30px;
												color: #666666;
												font-family: Helvetica, Arial, sans-serif;
												font-size: 14px;
												font-weight: 400;
												line-height: 18px;
											"
										>
											<p style="margin: 0">
												Charitable Registration No. 771791670 RR
												0001
											</p>
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
		console.log("arrived at login function");
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
			`<!DOCTYPE html>
			<html>
				<head>
					<title></title>
					<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
					<meta name="viewport" content="width=device-width, initial-scale=1" />
					<meta http-equiv="X-UA-Compatible" content="IE=edge" />
					<style type="text/css">
						/* CLIENT-SPECIFIC STYLES */
						body,
						table,
						td,
						a {
							-webkit-text-size-adjust: 100%;
							-ms-text-size-adjust: 100%;
						}
						table,
						td {
							mso-table-lspace: 0pt;
							mso-table-rspace: 0pt;
						}
						img {
							-ms-interpolation-mode: bicubic;
						}
			
						/* RESET STYLES */
						img {
							border: 0;
							height: auto;
							line-height: 100%;
							outline: none;
							text-decoration: none;
						}
						table {
							border-collapse: collapse !important;
						}
						body {
							height: 100% !important;
							margin: 0 !important;
							padding: 0 !important;
							width: 100% !important;
						}
			
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
						@media screen and (max-width: 600px) {
							h1 {
								font-size: 32px !important;
								line-height: 32px !important;
							}
						}
			
						/* ANDROID CENTER FIX */
						div[style*="margin: 16px 0;"] {
							margin: 0 !important;
						}
					</style>
			
					<style type="text/css"></style>
				</head>
				<body
					style="
						background-color: #f4f4f4;
						margin: 0 !important;
						padding: 0 !important;
					"
				>
					<!-- HIDDEN PREHEADER TEXT -->
					<div
						style="
							display: none;
							font-size: 1px;
							color: #fefefe;
							line-height: 1px;
							font-family: Helvetica, Arial, sans-serif;
							max-height: 0px;
							max-width: 0px;
							opacity: 0;
							overflow: hidden;
						"
					>
						Reset Password
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
								<table
									border="0"
									cellpadding="0"
									cellspacing="0"
									width="100%"
									style="max-width: 600px"
								>
									<tr>
										<td
											align="center"
											valign="top"
											style="padding: 40px 10px 40px 10px"
										>
											<a
												href="https://www.projecttechconferences.com/"
												target="_blank"
											>
												<img
													alt="Logo"
													src="https://static.wixstatic.com/media/6ec599_870d216ee50e4be8afbba1edafcfe4f3~mv2_d_2048_2048_s_2.png/v1/fill/w_160,h_149,al_c,q_85,usm_0.66_1.00_0.01,enc_auto/PTC%20Logo%20Transparent.png"
													width="169"
													height="40"
													style="
														display: block;
														width: 169px;
														max-width: 169px;
														min-width: 169px;
														font-family: Helvetica, Arial,
															sans-serif;
														color: #ffffff;
														font-size: 18px;
													"
													border="0"
												/>
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
							<td
								bgcolor="#f4f4f4"
								align="center"
								style="padding: 0px 10px 0px 10px"
							>
								<!--[if (gte mso 9)|(IE)]>
									<table align="center" border="0" cellspacing="0" cellpadding="0" width="600">
									<tr>
									<td align="center" valign="top" width="600">
									<![endif]-->
								<table
									border="0"
									cellpadding="0"
									cellspacing="0"
									width="100%"
									style="max-width: 600px"
								>
									<tr>
										<td
											bgcolor="#ffffff"
											align="center"
											valign="top"
											style="
												padding: 40px 20px 20px 20px;
												border-radius: 4px 4px 0px 0px;
												color: #111111;
												font-family: Helvetica, Arial, sans-serif;
												font-size: 48px;
												font-weight: 400;
												letter-spacing: 4px;
												line-height: 48px;
											"
										>
											<h1
												style="
													font-size: 28px;
													font-weight: 400;
													margin: 0;
													letter-spacing: 0px;
												"
											>
												Password Change Successful
											</h1>
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
							<td
								bgcolor="#f4f4f4"
								align="center"
								style="padding: 0px 10px 0px 10px"
							>
								<!--[if (gte mso 9)|(IE)]>
									<table align="center" border="0" cellspacing="0" cellpadding="0" width="600">
									<tr>
									<td align="center" valign="top" width="600">
									<![endif]-->
								<table
									border="0"
									cellpadding="0"
									cellspacing="0"
									width="100%"
									style="max-width: 600px"
								>
									<!-- COPY -->
									<tr>
										<td
											bgcolor="#ffffff"
											align="left"
											style="
												padding: 20px 30px 40px 30px;
												color: #666666;
												font-family: Helvetica, Arial, sans-serif;
												font-size: 18px;
												font-weight: 400;
												line-height: 25px;
											"
										>
											<p style="margin: 0">Hello ${username},</p>
											<p style="margin: 0">
												Your password has been changed successfully.
											</p>
										</td>
									</tr>
			
									<tr>
										<td
											bgcolor="#ffffff"
											align="left"
											style="
												padding: 0px 30px 20px 30px;
												color: #666666;
												font-family: Helvetica, Arial, sans-serif;
												font-size: 18px;
												font-weight: 400;
												line-height: 25px;
											"
										>
											<p style="margin: 0">
												If you have any questions, please send us an
												email — we're always happy to help out!
											</p>
										</td>
									</tr>
									<!-- COPY -->
									<tr>
										<td
											bgcolor="#ffffff"
											align="left"
											style="
												padding: 0px 30px 40px 30px;
												border-radius: 0px 0px 4px 4px;
												color: #666666;
												font-family: Helvetica, Arial, sans-serif;
												font-size: 18px;
												font-weight: 400;
												line-height: 25px;
											"
										>
											<p style="margin: 0">
												Cheers,<br />The PTC Coding Challenge Team
											</p>
										</td>
									</tr>
								</table>
							</td>
						</tr>
						<!-- FOOTER -->
						<tr>
							<td
								bgcolor="#f4f4f4"
								align="center"
								style="padding: 0px 10px 0px 10px"
							>
								<table
									border="0"
									cellpadding="0"
									cellspacing="0"
									width="100%"
									style="max-width: 600px"
								>
									<!-- NAVIGATION -->
									<tr>
										<td
											bgcolor="#f4f4f4"
											align="left"
											style="
												padding: 30px 30px 30px 30px;
												color: #666666;
												font-family: Helvetica, Arial, sans-serif;
												font-size: 14px;
												font-weight: 400;
												line-height: 18px;
											"
										>
											<p style="margin: 0">
												<a
													href="https://www.projecttechconferences.com/"
													target="_blank"
													style="color: #111111; font-weight: 700"
													>PTC Website</a
												>
												-
												<a
													href="https://coding-challenge.projecttechconferences.com/"
													target="_blank"
													style="color: #111111; font-weight: 700"
													>PTC Coding Challenge</a
												>
												-
												<a
													href="https://www.projecttechconferences.com/contact"
													target="_blank"
													style="color: #111111; font-weight: 700"
													>Contact Us</a
												>
											</p>
										</td>
									</tr>
									<!-- ADDRESS -->
									<tr>
										<td
											bgcolor="#f4f4f4"
											align="left"
											style="
												padding: 0px 30px 30px 30px;
												color: #666666;
												font-family: Helvetica, Arial, sans-serif;
												font-size: 14px;
												font-weight: 400;
												line-height: 18px;
											"
										>
											<p style="margin: 0">
												Charitable Registration No. 771791670 RR
												0001
											</p>
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
					<meta name="viewport" content="width=device-width, initial-scale=1" />
					<meta http-equiv="X-UA-Compatible" content="IE=edge" />
					<style type="text/css">
						/* CLIENT-SPECIFIC STYLES */
						body,
						table,
						td,
						a {
							-webkit-text-size-adjust: 100%;
							-ms-text-size-adjust: 100%;
						}
						table,
						td {
							mso-table-lspace: 0pt;
							mso-table-rspace: 0pt;
						}
						img {
							-ms-interpolation-mode: bicubic;
						}
			
						/* RESET STYLES */
						img {
							border: 0;
							height: auto;
							line-height: 100%;
							outline: none;
							text-decoration: none;
						}
						table {
							border-collapse: collapse !important;
						}
						body {
							height: 100% !important;
							margin: 0 !important;
							padding: 0 !important;
							width: 100% !important;
						}
			
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
						@media screen and (max-width: 600px) {
							h1 {
								font-size: 32px !important;
								line-height: 32px !important;
							}
						}
			
						/* ANDROID CENTER FIX */
						div[style*="margin: 16px 0;"] {
							margin: 0 !important;
						}
					</style>
			
					<style type="text/css"></style>
				</head>
				<body
					style="
						background-color: #f4f4f4;
						margin: 0 !important;
						padding: 0 !important;
					"
				>
					<!-- HIDDEN PREHEADER TEXT -->
					<div
						style="
							display: none;
							font-size: 1px;
							color: #fefefe;
							line-height: 1px;
							font-family: Helvetica, Arial, sans-serif;
							max-height: 0px;
							max-width: 0px;
							opacity: 0;
							overflow: hidden;
						"
					>
						Reset Password
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
								<table
									border="0"
									cellpadding="0"
									cellspacing="0"
									width="100%"
									style="max-width: 600px"
								>
									<tr>
										<td
											align="center"
											valign="top"
											style="padding: 40px 10px 40px 10px"
										>
											<a
												href="https://www.projecttechconferences.com/"
												target="_blank"
											>
												<img
													alt="Logo"
													src="https://static.wixstatic.com/media/6ec599_870d216ee50e4be8afbba1edafcfe4f3~mv2_d_2048_2048_s_2.png/v1/fill/w_160,h_149,al_c,q_85,usm_0.66_1.00_0.01,enc_auto/PTC%20Logo%20Transparent.png"
													width="169"
													height="40"
													style="
														display: block;
														width: 169px;
														max-width: 169px;
														min-width: 169px;
														font-family: Helvetica, Arial,
															sans-serif;
														color: #ffffff;
														font-size: 18px;
													"
													border="0"
												/>
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
							<td
								bgcolor="#f4f4f4"
								align="center"
								style="padding: 0px 10px 0px 10px"
							>
								<!--[if (gte mso 9)|(IE)]>
									<table align="center" border="0" cellspacing="0" cellpadding="0" width="600">
									<tr>
									<td align="center" valign="top" width="600">
									<![endif]-->
								<table
									border="0"
									cellpadding="0"
									cellspacing="0"
									width="100%"
									style="max-width: 600px"
								>
									<tr>
										<td
											bgcolor="#ffffff"
											align="center"
											valign="top"
											style="
												padding: 40px 20px 20px 20px;
												border-radius: 4px 4px 0px 0px;
												color: #111111;
												font-family: Helvetica, Arial, sans-serif;
												font-size: 48px;
												font-weight: 400;
												letter-spacing: 4px;
												line-height: 48px;
											"
										>
											<h1
												style="
													font-size: 28px;
													font-weight: 400;
													margin: 0;
													letter-spacing: 0px;
												"
											>
												Reset Password
											</h1>
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
							<td
								bgcolor="#f4f4f4"
								align="center"
								style="padding: 0px 10px 0px 10px"
							>
								<!--[if (gte mso 9)|(IE)]>
									<table align="center" border="0" cellspacing="0" cellpadding="0" width="600">
									<tr>
									<td align="center" valign="top" width="600">
									<![endif]-->
								<table
									border="0"
									cellpadding="0"
									cellspacing="0"
									width="100%"
									style="max-width: 600px"
								>
									<!-- COPY -->
									<tr>
										<td
											bgcolor="#ffffff"
											align="left"
											style="
												padding: 20px 30px 40px 30px;
												color: #666666;
												font-family: Helvetica, Arial, sans-serif;
												font-size: 18px;
												font-weight: 400;
												line-height: 25px;
											"
										>
											<p style="margin: 0">Hello ${username},</p>
											<p style="margin: 0">
												We've received a request to reset the
												password for the PTC account associated
												with: ${email}.
											</p>
											<p style="margin: 0">
												You can reset your password by clicking the
												link below:
											</p>
										</td>
									</tr>
									<!-- BULLETPROOF BUTTON -->
									<tr>
										<td bgcolor="#ffffff" align="left">
											<table
												width="100%"
												border="0"
												cellspacing="0"
												cellpadding="0"
											>
												<tr>
													<td
														bgcolor="#ffffff"
														align="center"
														style="padding: 20px 30px 60px 30px"
													>
														<table
															border="0"
															cellspacing="0"
															cellpadding="0"
														>
															<tr>
																<td
																	align="center"
																	style="
																		border-radius: 15px;
																	"
																	bgcolor="#1b9cf7"
																>
																	<a
																		href="http://localhost:3000/change-password/${token}"
																		target="_blank"
																		style="
																			font-size: 20px;
																			font-family: Helvetica,
																				Arial,
																				sans-serif;
																			color: #ffffff;
																			text-decoration: none;
																			color: #ffffff;
																			text-decoration: none;
																			padding: 15px
																				40px;
			
																			display: inline-block;
																		"
																		>Reset Password</a
																	>
																</td>
															</tr>
														</table>
													</td>
												</tr>
											</table>
										</td>
									</tr>
									<!-- COPY -->
									<tr>
										<td
											bgcolor="#ffffff"
											align="left"
											style="
												padding: 0px 30px 0px 30px;
												color: #666666;
												font-family: Helvetica, Arial, sans-serif;
												font-size: 18px;
												font-weight: 400;
												line-height: 25px;
											"
										>
											<p style="margin: 0">
												If that doesn't work, copy and paste the
												following link in your browser:
											</p>
										</td>
									</tr>
									<!-- COPY -->
									<tr>
										<td
											bgcolor="#ffffff"
											align="left"
											style="
												padding: 20px 30px 20px 30px;
												color: #666666;
												font-family: Helvetica, Arial, sans-serif;
												font-size: 18px;
												font-weight: 400;
												line-height: 25px;
											"
										>
											<p style="margin: 0">
												<a
													href="http://localhost:3000/change-password/${token}"
													target="_blank"
													style="color: #4a35ea"
													>http://localhost:3000/change-password/${token}</a
												>
											</p>
										</td>
									</tr>
									<!-- COPY -->
									<tr>
										<td
											bgcolor="#ffffff"
											align="left"
											style="
												padding: 0px 30px 20px 30px;
												color: #666666;
												font-family: Helvetica, Arial, sans-serif;
												font-size: 18px;
												font-weight: 400;
												line-height: 25px;
											"
										>
											<p style="margin: 0">
												If you have any questions, just reply to
												this email—we're always happy to help out.
											</p>
										</td>
									</tr>
									<!-- COPY -->
									<tr>
										<td
											bgcolor="#ffffff"
											align="left"
											style="
												padding: 0px 30px 40px 30px;
												border-radius: 0px 0px 4px 4px;
												color: #666666;
												font-family: Helvetica, Arial, sans-serif;
												font-size: 18px;
												font-weight: 400;
												line-height: 25px;
											"
										>
											<p style="margin: 0">
												Cheers,<br />The PTC Coding Challenge Team
											</p>
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
							<td
								bgcolor="#f4f4f4"
								align="center"
								style="padding: 0px 10px 0px 10px"
							>
								<!--[if (gte mso 9)|(IE)]>
									<table align="center" border="0" cellspacing="0" cellpadding="0" width="600">
									<tr>
									<td align="center" valign="top" width="600">
									<![endif]-->
								<table
									border="0"
									cellpadding="0"
									cellspacing="0"
									width="100%"
									style="max-width: 600px"
								>
									<!-- NAVIGATION -->
									<tr>
										<td
											bgcolor="#f4f4f4"
											align="left"
											style="
												padding: 30px 30px 30px 30px;
												color: #666666;
												font-family: Helvetica, Arial, sans-serif;
												font-size: 14px;
												font-weight: 400;
												line-height: 18px;
											"
										>
											<p style="margin: 0">
												<a
													href="https://www.projecttechconferences.com/"
													target="_blank"
													style="color: #111111; font-weight: 700"
													>PTC Website</a
												>
												-
												<a
													href="http://localhost:3000"
													target="_blank"
													style="color: #111111; font-weight: 700"
													>PTC Coding Challenge</a
												>
												-
												<a
													href="https://www.projecttechconferences.com/contact"
													target="_blank"
													style="color: #111111; font-weight: 700"
													>Contact Us</a
												>
											</p>
										</td>
									</tr>
									<!-- ADDRESS -->
									<tr>
										<td
											bgcolor="#f4f4f4"
											align="left"
											style="
												padding: 0px 30px 30px 30px;
												color: #666666;
												font-family: Helvetica, Arial, sans-serif;
												font-size: 14px;
												font-weight: 400;
												line-height: 18px;
											"
										>
											<p style="margin: 0">
												Charitable Registration No. 771791670 RR
												0001
											</p>
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
