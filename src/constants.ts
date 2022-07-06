export const __prod__ = process.env.NODE_ENV === "production";
export const COOKIE_NAME = "qid";
export const FORGOT_PASSWORD_PREFIX = "forgot-password:";
export const PORT = process.env.PORT || 4000;
export const DATABASE_URL = __prod__
	? process.env.DATABASE_URL
	: process.env.LOCAL_DATABASE_URL;
