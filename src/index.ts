import { AppDataSource } from "./typeorm-config";

const main = async () => {
	await AppDataSource.initialize();
};

main().catch((err) => {
	console.error(err);
});
