import { Submissions } from '../entities/Submissions';
import { MyContext } from '../types';
import { Arg, Ctx, Field, ObjectType, Query } from 'type-graphql';
import { User } from '../entities/Users';
import { AppDataSource } from '../typeorm-config';
import { S3 } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

@ObjectType()
class PresignedUrlInput {
  @Field()
  fileName: String;
  @Field()
  metadata: String;
  @Field()
  path: String;
  @Field()
  fileType: String;
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
    @Arg('username') username: string
  ): Promise<Submissions[] | null> {
    return Submissions.find({ where: { username: username } });
  }

  @Query(() => String)
  async presignedURL(
    @Arg('presignedUrlInput') presignedUrlInput: PresignedUrlInput
  ): Promise<String> {
    //function ()

    const { fileName, metadata, path, fileType } = presignedUrlInput;

    const cleanedFileName = fileName.replace(/\s+/g, '');
    // const mimeFileType = mime.lookup(fileType);

    const s3 = new S3({
      accessKeyId: process.env.AWS_USER_KEY,
      secretAccessKey: process.env.AWS_SECRET_KEY,
      region: process.env.S3_REGION
    });

    var fileKey: String;
    if (path === '/') fileKey = `misc/${uuidv4()}-${cleanedFileName}`;
    else fileKey = `${path}/${uuidv4()}-${cleanedFileName}`;

    const s3Params = {
      Bucket: process.env.PUBLIC_S3_BUCKET,
      Key: fileKey,
      Metadata: metadata,
      Expires: 120,
      // ContentType: mimeFileType,
      ACL: 'public-read'
    };

    // Make a request to the S3 API to get a signed URL which we can use to upload our file
    s3.getSignedUrl('putObject', s3Params, (err, data) => {
      // if (err) {
      // console.log(err);
      // return res.status(500).json({
      // 	errorMessage: "An internal server error occurred, please try again."
      // });
      // }
      // Data payload of what we are sending back, the url of the signedRequest and a URL where we can access the content after its saved.
      const returnData = {
        signedRequest: data,
        fileKey
        // mimeFileType
      };
      //console.log(returnData);
    //   var req: any;
    //   req.question = req.body.returnData = returnData;
    // });

    try {
    //   const { fileKey, userId } = returnData;
    //   //IMPORTANT: fix the structure of the req info!
    //   const userId = req.body.userId;
    //   const fileKey = req.body.returnData.fileKey;
    //   const question = req.body.metadata.question;
    //   console.log(userId, fileKey, question);
    //   console.log('in the mongo creation area');

    //   const existingSubmission = await Submission.findOne({
    //     userId: userId,
    //     question: question
    //   });

    //   console.log('existing sub ', existingSubmission);
    //   if (!existingSubmission) {
    //     //create a submission instance
    //     console.log('create new submission object');
    //     const newSubmission = new Submission({
    //       userId: userId,
    //       question: question,
    //       //uploadDate: String,
    //       fileKey: fileKey
    //     });
    //     const saveNewSub = await newSubmission.save();
    //   } else {
    //     // deleting old object
    //     var oldFileKey = existingSubmission.fileKey;
    //     awsDelete(oldFileKey);

    //     // update updateFileKey in db
    //     const updateFileKey = {
    //       $set: {
    //         fileKey: fileKey
    //       }
    //     };
    //     const updateSub = await Submission.updateOne(
    //       existingSubmission,
    //       updateFileKey
    //     );
    //     //update the existingSubmission document
    //     //return;
    //   }

    //   res.status(200).json(req.body.returnData);
    } catch (error) {
    //   res
    //     .status(500)
    //     .json({ errorMessage: 'Internal Server Error while saving to Mongo' });
    }

    return '1';
  }

  @Query(() => [Submissions], { nullable: true })
  async topScores(): Promise<Submissions[] | null> {
    let user;
    try {
      user = await AppDataSource.createQueryBuilder(Submissions, 'submissions')
        .select(['username', 'points'])
        .addSelect('rank() over (order by points desc)')
        .orderBy('points', 'DESC')
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
