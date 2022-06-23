import { S3 } from "aws-sdk";
import { Arg, Ctx, Field, InputType, Query } from "type-graphql";
import { v4 as uuidv4 } from "uuid";
import { Submissions } from "../entities/Submissions";
import { User } from "../entities/Users";
import { AppDataSource } from "../typeorm-config";
import { MyContext } from "../types";

@InputType()
class Metadata {
	@Field()
	question: string;
	@Field()
	email: string;
}

@InputType()
class PresignedUrlInput {
	@Field()
	fileName: string;
	@Field()
	metadata: Metadata;
	@Field()
	path: string;
	@Field()
	fileType: string;
}

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

	@Query(() => String)
	async presignedURL(
		@Arg("presignedUrlInput") presignedUrlInput: PresignedUrlInput
	): Promise<string> {
		// const { fileName, metadata, path } = presignedUrlInput;
		const fileName = presignedUrlInput.fileName;
		const metadata = presignedUrlInput.metadata;
		const path = presignedUrlInput.path;

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

		// Make a request to the S3 API to get a signed URL which we can use to upload our file
		s3.getSignedUrl("putObject", s3Params, (err, data) => {
			if (err) {
				console.log(err);
			} // return res.status(500).json({
			// 	errorMessage: "An internal server error occurred, please try again."
			// });
			// }
			// Data payload of what we are sending back, the url of the signedRequest and a URL where we can access the content after its saved.
			const returnData = {
				signedRequest: data,
				fileKey,
				// mimeFileType
			};
			console.log(returnData);
			// var req: any;
			// req.question = req.body.returnData = returnData;
		});

		return "1";
	}

	@Query(() => [Submissions], { nullable: true })
	async topScores(): Promise<Submissions[] | null> {
		let user;
		try {
			user = await AppDataSource.createQueryBuilder(
				Submissions,
				"submissions"
			)
				.select(["username", "points"])
				.addSelect("rank() over (order by points desc)")
				.orderBy("points", "DESC")
				.limit(10)
				.getRawMany();
			// .execute();
		} catch (error) {
			console.log(error.detail);
		}
		console.log(user);
		return user;
	}
}
