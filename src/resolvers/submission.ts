// @ts-nocheck
import { S3 } from "aws-sdk";

import mime from "mime";
import { isAuth } from "../middleware/useIsAuth";
import { isAdmin } from "../middleware/useIsAdmin";
import { Arg, Ctx, Mutation, Query, UseMiddleware } from "type-graphql";
import { v4 as uuidv4 } from "uuid";
import { Submissions } from "../entities/Submissions";
import { User } from "../entities/Users";
import { AppDataSource } from "../typeorm-config";
import { MyContext } from "../types";
import {
	CreateSubmissionInput,
	CreateSubmissionResponse,
	ExistingSubmissionResponse,
	PresignedUrlInput,
	S3SubmissionResponse,
	TopQuery,
	UserResponse,
	UpdatePointsInput,
	MessageField,
} from "./ResolverTypes";

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
	// @UseMiddleware(isAuth)
	async userPoints(@Ctx() { req }: MyContext): Promise<Submissions[] | null> {
		return Submissions.find({
			where: { creator: { id: req.session.userId } },
		});
	}

	@Mutation(() => UserResponse)
	async deleteFile(@Arg("fileKey") fileKey: string): Promise<UserResponse> {
		const s3 = new S3({
			accessKeyId: process.env.AWS_USER_KEY,
			secretAccessKey: process.env.AWS_SECRET_KEY,
			region: process.env.S3_REGION,
		});
		const s3Params = {
			Bucket: process.env.PUBLIC_S3_BUCKET,
			Key: fileKey,
		};

		s3.deleteObject(s3Params, function (err, data) {
			console.log("ERR: ", err);
			console.log("DATA: ", data);
			if (err) {
				return {
					error: [
						{
							field: "Delete File",
							message: "Delete failed.",
						},
					],
				};
			}
			return;
		});
		return {
			success: [
				{
					field: "Delete File",
					message: "Successfully deleted previous file.",
				},
			],
		};
	}

	@Mutation(() => S3SubmissionResponse, { nullable: true })
	@UseMiddleware(isAuth)
	async uploadFile(
		@Arg("presignedUrlInput") presignedUrlInput: PresignedUrlInput
	): Promise<S3SubmissionResponse | null> {
		const { fileName, metadata, path, fileType } = presignedUrlInput;

		console.log("REGION: ", process.env.S3_REGION);

		const cleanedFileName = fileName.replace(/\s+/g, "");
		const mimeFileType = mime.lookup(fileType);
		const s3 = new S3({
			accessKeyId: process.env.AWS_USER_KEY,
			secretAccessKey: process.env.AWS_SECRET_KEY,
			region: process.env.S3_REGION,
			apiVersion: "2006-03-01",
			signatureVersion: "v4",
		});

		let fileKey: string;
		if (path === "/") fileKey = `misc/${uuidv4()}-${cleanedFileName}`;
		else fileKey = `${path}/${uuidv4()}-${cleanedFileName}`;

		const s3Params = {
			Bucket: process.env.PUBLIC_S3_BUCKET,
			Key: fileKey,
			Metadata: metadata,
			Expires: 120,
			// ContentType: "text/plain",
			// ACL: "public-read",
		};
		// let returnData = null;
		// Make a request to the S3 API to get a signed URL which we can use to upload our file
		let s3Url;
		try {
			s3Url = s3.getSignedUrl("putObject", s3Params);
		} catch (err) {
			return {
				errors: [
					{
						field: " signedUrl",
						message: `Error: could not generate S3 presigned url - ${err}`,
					},
				],
			};
		}
		const uploadData = {
			signedRequest: s3Url,
			fileKey,
		};
		return { uploadData };
	}
	@Mutation(() => ExistingSubmissionResponse)
	// @UseMiddleware(isAuth)
	async existingSubmission(
		@Arg("question")
		question: string,
		@Ctx() { req }: MyContext
	): Promise<ExistingSubmissionResponse> {
		const MAX_UPDATES = 3;
		// console.log(req.sessionID);
		const existingSubmission = await Submissions.findOne({
			where: { creatorId: req.session.userId, question },
			// where: { creatorId: 9, question },
		});
		// console.log(existingSubmission);
		if (existingSubmission) {
			if (existingSubmission.updates < MAX_UPDATES) {
				return {
					existing: true,
					id: existingSubmission.id,
					creatorId: req.session.userId,
					updates: existingSubmission.updates,
					fileKey: existingSubmission.fileKey,
				};
			} else {
				return {
					errors: [
						{
							field: "Max Submissions",
							message:
								"You have exceeded the max number of submissions.",
						},
					],
					existing: true,
				};
			}
		}
		return {
			existing: false,
		};
	}

	@Mutation(() => CreateSubmissionResponse)
	async createSubmission(
		@Arg("options")
		options: CreateSubmissionInput,
		@Ctx() { req }: MyContext
	): Promise<CreateSubmissionResponse> {
		let newSubmission;
		// console.log(options.updates);
		if (options.existing && options.updates !== undefined) {
			console.log("here");
			newSubmission = await Submissions.update(
				{
					id: options.id,
					creatorId: options.creatorId,
					question: options.question,
				},
				{
					updates: options.updates + 1,
					fileKey: options.fileKey,
				}
			);
			return {
				success: [
					{
						field: "Update Submissions",
						message: "Existing submission succesfully updated.",
					},
				],
			};
		}
		// console.log(req.session.userId);
		// check for existing submission and <= 3
		newSubmission = await Submissions.create({
			...options,
			updates: 0,
			creatorId: req.session.userId,
			// creatorId: 9,
		}).save();
		return { submission: newSubmission };
	}

	@Mutation(() => S3SubmissionResponse, { nullable: true })
	// @UseMiddleware(isAuth)
	async viewFile(
		@Arg("question") question: string,
		@Ctx() { req }: MyContext
	): Promise<S3SubmissionResponse | null> {
		// get the file ID from postgresql
		const existingSubmission = await Submissions.findOne({
			where: { creatorId: req.session.userId, question },
		});

		// if no submission - return none
		if (!existingSubmission) {
			return {
				errors: [
					{
						field: " signedUrl",
						message: `Error: could not find file for this submission`,
					},
				],
			};
		}

		const s3 = new S3({
			accessKeyId: process.env.AWS_USER_KEY,
			secretAccessKey: process.env.AWS_SECRET_KEY,
			region: process.env.S3_REGION,
		});

		const s3Params = {
			Bucket: process.env.PUBLIC_S3_BUCKET,
			Key: existingSubmission.fileKey,
			//Metadata: metadata,
			Expires: 120,
			// ContentType: "text/plain",
			// ACL: "public-read",
		};
		let s3Url;
		try {
			s3Url = s3.getSignedUrl("getObject", s3Params);
		} catch (err) {
			return {
				errors: [
					{
						field: " signedUrl",
						message: `Error: could not generate S3 presigned url - ${err}`,
					},
				],
			};
		}
		const uploadData = {
			signedRequest: s3Url,
			fileKey: existingSubmission.fileKey,
		};
		return { uploadData };
	}
	@Query(() => [TopQuery], { nullable: true })
	async topScores(): Promise<TopQuery[] | null> {
		console.log("arrived here ");
		const RANK_LIMIT = 10;
		try {
			const user: TopQuery[] = await AppDataSource.query(`
			SELECT username, "totalPoints", rank() over (order by "totalPoints" desc)  FROM "user" LIMIT 10;
			`);
			console.log(typeof user);
			console.log("user: ", user);
			return user;
		} catch (error) {
			console.log(error);
			console.log(error.detail);
		}
		return null;
	}
	@UseMiddleware(isAdmin)
	@Mutation(() => MessageField)
	async updatePoints(
		@Arg("rows", (type) => [UpdatePointsInput])
		rows: UpdatePointsInput[]
	): Promise<MessageField> {
		const table = "submissions";

		let updateTuples = "";
		for (var i = 0, l = rows.length; i < l; i++) {
			if (i !== l - 1) {
				updateTuples += `('${rows[i].fileKey}', ${rows[i].points}),`;
			} else {
				updateTuples += `('${rows[i].fileKey}', ${rows[i].points})`;
			}
		}

		const updateQuery = `
		update submissions as m set
		points = c.points
		from (values
		${updateTuples}
		) as c("fileKey", points)
		where m."fileKey" like '%'  || c."fileKey" || '%';
		`;

		try {
			const user = await AppDataSource.query(updateQuery);
			if (user[1] !== 0) {
				return {
					field: "Update Scores Success",
					message: "Successfully updated user scores",
				};
			}
			throw new Error("No rows updated");
		} catch (error) {
			return {
				field: "Update Scores Fail",
				message: `Failed to update scores: ${error}`,
			};
		}
	}
}
