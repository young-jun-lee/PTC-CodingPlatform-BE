import { User } from "../entities/Users";
import { ObjectType, Field, InputType } from "type-graphql";

@ObjectType()
export class TopQuery {
	@Field()
	username: string;
	@Field()
	rank: number;
	@Field()
	points: number;
}

// define a custom error containing which field was problematic and a nice message
@ObjectType()
export class MessageField {
	@Field()
	field: string;
	@Field()
	message: string;
}

@ObjectType()
export class SignedUrlData {
	@Field()
	signedRequest: string;
	@Field()
	fileKey: string;
}
// define a custom object type to return for login, which will return either a FieldError or the user
// question mark operator indicates that it is an optional field, so the returned response is an object that
// may include errors and may include a user
@ObjectType()
export class UserResponse {
	@Field(() => [MessageField], { nullable: true })
	errors?: MessageField[];

	@Field(() => [MessageField], { nullable: true })
	success?: MessageField[];

	@Field(() => User, { nullable: true })
	user?: User;
}

@ObjectType()
export class SubmissionResponse {
	@Field(() => [MessageField], { nullable: true })
	errors?: MessageField[];

	@Field(() => SignedUrlData, { nullable: true })
	uploadData?: SignedUrlData;
}

/**
 * Input Types used as Args in resolvers
 */

@InputType()
class Metadata {
	@Field()
	question: string;
	@Field()
	email: string;
}

@InputType()
export class PresignedUrlInput {
	@Field()
	fileName: string;
	@Field()
	metadata: Metadata;
	@Field()
	path: string;
	@Field()
	fileType: string;
}

@InputType()
export class UsernamePasswordInput {
	@Field()
	username: string;
	@Field()
	firstName: string;
	@Field()
	lastName: string;
	@Field()
	email: string;
	@Field()
	password: string;
}
