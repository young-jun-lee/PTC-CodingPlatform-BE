import { Field, Int, ObjectType } from "type-graphql";
import {
	BaseEntity,
	Column,
	CreateDateColumn,
	Entity,
	OneToMany,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from "typeorm";
import { Submissions } from "./Submissions";

@ObjectType()
@Entity()
export class User extends BaseEntity {
	@Field(() => Int)
	@PrimaryGeneratedColumn()
	id!: number;

	@Field(() => String)
	@CreateDateColumn()
	createdAt = Date;

	@Field(() => String)
	@UpdateDateColumn()
	updatedAt = Date;

	@Field()
	@Column({ type: "text", unique: true })
	username!: string;

	@Field()
	@Column({ type: "text" })
	firstName!: string;

	@Field()
	@Column({ type: "text" })
	lastName!: string;

	@Field()
	@Column({ type: "text", unique: true })
	email!: string;

	@Column({ type: "text" })
	password!: string;

	@Field(() => Int)
	@Column("int", { default: 0 })
	totalPoints!: number;

	// @Field()
	// @Column({
	// 	type: "int",
	// 	nullable: true,
	// })
	// rank: number;

	@Field()
	@Column("boolean", { default: false })
	isAdmin: boolean = false;

	@OneToMany(
		() => Submissions,
		(submission: Submissions) => submission.creator
	)
	submissions: Submissions[];
}
