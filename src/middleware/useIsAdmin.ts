import { MyContext } from "../types";
import { MiddlewareFn } from "type-graphql";
import { User } from "../entities/Users";

// MiddlewareFn is from typegraphql that runs before our resolvesr, so it has access to args, context, info, root
export const isAdmin: MiddlewareFn<MyContext> = async ({ context }, next) => {
	console.log("calling from middleware function");
	// console.log(context.req.session);
	if (!context.req.session.userId) {
		throw new Error(
			"You are not authorized to perform this action. Please login and try again."
		);
	}

	const user = await User.findOne({
		where: { id: context.req.session.userId },
	});
	if (!user?.isAdmin) {
		throw new Error("You are not authorized to perform this action.");
	}
	return next();
};
