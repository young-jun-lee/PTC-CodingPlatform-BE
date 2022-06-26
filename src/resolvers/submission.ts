import { S3 } from "aws-sdk";
import mime from "mime";
import { Arg, Ctx, Mutation, Query } from "type-graphql";
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
	UsernamePasswordInput,
	UserResponse,
	ViewFileInput,
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
	async userPoints(
		// @Arg("username") username: string,
		@Ctx() { req }: MyContext
	): Promise<Submissions[] | null> {
		// return Submissions.find({ where: { username: username } });
		return Submissions.find({
			where: { creator: { id: req.session.userId } },
		});
	}

	// @Query(() => SignedUrlData, { nullable: true })
	@Mutation(() => S3SubmissionResponse, { nullable: true })
	async uploadFile(
		@Arg("presignedUrlInput") presignedUrlInput: PresignedUrlInput
	): Promise<S3SubmissionResponse | null> {
		console.log("arrived here");
		const { fileName, metadata, path, fileType } = presignedUrlInput;

		const cleanedFileName = fileName.replace(/\s+/g, "");
		const mimeFileType = mime.lookup(fileType);
		const s3 = new S3({
			accessKeyId: process.env.AWS_USER_KEY,
			secretAccessKey: process.env.AWS_SECRET_KEY,
			region: process.env.S3_REGION,
		});

		var fileKey: string;
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
	async existingSubmission(
		@Arg("question")
		question: string,
		@Ctx() { req }: MyContext
	): Promise<ExistingSubmissionResponse> {
		const MAX_UPDATES = 3;
		console.log(req.sessionID);
		const existingSubmission = await Submissions.findOne({
			where: { creatorId: req.session.userId, question },
			// where: { creatorId: 9, question },
		});
		console.log(existingSubmission);
		if (existingSubmission) {
			if (existingSubmission.updates < MAX_UPDATES) {
				return {
					existing: true,
					id: existingSubmission.id,
					creatorId: req.session.userId,
					updates: existingSubmission.updates,
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
		if (options.existing && options.updates !== undefined) {
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

		// check for existing submission and <= 3
		newSubmission = await Submissions.create({
			...options,
			creatorId: req.session.userId,
			// creatorId: 9,
		}).save();
		return { submission: newSubmission };
	}

	// @Mutation(() => SubmissionResponse, { nullable: true })
	// async viewFile(
	// 	@Arg("viewFileInput") viewFileInput: ViewFileInput
	// ): Promise<SubmissionResponse | null> {
	// 	console.log("arrived here");
	// 	const { userId, question } = viewFileInput;
	// 	console.log(userId);

	// 	const s3 = new S3({
	// 		accessKeyId: process.env.AWS_USER_KEY,
	// 		secretAccessKey: process.env.AWS_SECRET_KEY,
	// 		region: process.env.S3_REGION,
	// 	});

	// 	var fileKey: string;
	// 	if (path === "/") fileKey = `misc/${uuidv4()}-${cleanedFileName}`;
	// 	else fileKey = `${path}/${uuidv4()}-${cleanedFileName}`;

	// 	const s3Params = {
	// 		Bucket: process.env.PUBLIC_S3_BUCKET,
	// 		Key: fileKey,
	// 		Metadata: metadata,
	// 		Expires: 120,
	// 		// ContentType: "text/plain",
	// 		// ACL: "public-read",
	// 	};
	// 	let s3Url;
	// 	try {
	// 		s3Url = s3.getSignedUrl("putObject", s3Params);
	// 	} catch (err) {
	// 		return {
	// 			errors: [
	// 				{
	// 					field: " signedUrl",
	// 					message: `Error: could not generate S3 presigned url - ${err}`,
	// 				},
	// 			],
	// 		};
	// 	}
	// 	const uploadData = {
	// 		signedRequest: s3Url,
	// 		fileKey,
	// 	};
	// 	return { uploadData };
	// }
	@Query(() => [TopQuery], { nullable: true })
	async topScores(): Promise<TopQuery[] | null> {
		console.log("arrived at topscores");
		try {
			const user: TopQuery[] = await AppDataSource.createQueryBuilder(
				Submissions,
				"submissions"
			)
				.select(["username", "points"])
				.addSelect("rank() over (order by points desc)")
				.orderBy("points", "DESC")
				.limit(10)
				.getRawMany();
			// .execute();
			console.log(user);
			return user;
		} catch (error) {
			console.log(error.detail);
		}
		return null;
	}
}
