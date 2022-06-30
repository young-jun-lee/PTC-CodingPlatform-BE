import { MyContext } from "../types";
import { MiddlewareFn } from "type-graphql";
import { MessageField } from "src/resolvers/ResolverTypes";

type AuthProps = {
	myContext?: MyContext;
	// errors?: MessageField[];
	errors?: string;
};

// MiddlewareFn is from typegraphql that runs before our resolvesr, so it has access to args, context, info, root
export const isAuth: MiddlewareFn<MyContext> = async ({ context }, next) => {
	console.log("calling from middleware function");
	if (!context.req.session.userId) {
		throw new Error(
			"You are not authorized to perform this action. Please login and try again."
		);
	}
	return next();
};
