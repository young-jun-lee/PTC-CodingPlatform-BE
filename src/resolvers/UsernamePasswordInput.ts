import { Field, InputType } from "type-graphql";

// another way to implementing arguments for methods instead of @Arg()

@InputType()
export class UsernamePasswordInput {
	@Field()
	username: string;
	@Field()
	email: string;
	@Field()
	password: string;
}
