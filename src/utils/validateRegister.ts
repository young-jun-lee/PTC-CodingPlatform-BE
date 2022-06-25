import { UsernamePasswordInput } from "../resolvers/ResolverTypes";

export const validateRegister = (options: UsernamePasswordInput) => {
	if (!options.email.includes("@")) {
		return [
			{
				field: "email",
				message: "Invalid email",
			},
		];
	}
	if (options.username.length <= 2) {
		return [
			{
				field: "username",
				message: "Username length must be greater than 2",
			},
		];
	}
	// we want to allow users to login with their email, so we can't have @ signs in their usernames
	// we need to be able to differentiate between emails and usernames
	if (options.username.includes("@")) {
		return [
			{
				field: "username",
				message: "Invalid symbol '@' in username",
			},
		];
	}

	if (options.password.length <= 3) {
		return [
			{
				field: "password",
				message: "Password length must be greater than 3",
			},
		];
	}
	return null;
};
