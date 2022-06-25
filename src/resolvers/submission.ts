import { S3 } from "aws-sdk";
import { Arg, Ctx, Query } from "type-graphql";
import { v4 as uuidv4 } from "uuid";
import { Submissions } from "../entities/Submissions";
import { User } from "../entities/Users";
import { AppDataSource } from "../typeorm-config";
import { MyContext } from "../types";
import {
	PresignedUrlInput,
	SubmissionResponse,
	TopQuery,
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
		@Arg("username") username: string
	): Promise<Submissions[] | null> {
		return Submissions.find({ where: { username: username } });
	}

	// @Query(() => SignedUrlData, { nullable: true })
	@Query(() => SubmissionResponse, { nullable: true })
	async uploadFile(
		@Arg("presignedUrlInput") presignedUrlInput: PresignedUrlInput
	): Promise<SubmissionResponse | null> {
		console.log("arrived here");
		const { fileName, metadata, path } = presignedUrlInput;
		// const fileName = presignedUrlInput.fileName;
		// const metadata = presignedUrlInput.metadata;
		// const path = presignedUrlInput.path;
		//
		const cleanedFileName = fileName.replace(/\s+/g, "");
		// const mimeFileType = mime.lookup(fileType);
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
			// ContentType: mimeFileType,
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

		// s3.getSignedUrl("putObject", s3Params, (err, url) => {
		// error handling
		// if (err) {
		// console.log(err);
		// return {
		// errors: [
		// {
		// field: " signedUrl",
		// message: `Error: ${err}`,
		// },
		// ],
		// };
		// }
		//
		// const uploadData = {
		// signedRequest: url,
		// fileKey,
		// };
		// });
	}

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
