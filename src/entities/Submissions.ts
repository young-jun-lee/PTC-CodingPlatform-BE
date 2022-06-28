import { Field, Int, ObjectType } from "type-graphql";
import {
	BaseEntity,
	Column,
	CreateDateColumn,
	Entity,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from "typeorm";
import { User } from "./Users";

@ObjectType()
@Entity()
export class Submissions extends BaseEntity {
	@Field(() => Int)
	@PrimaryGeneratedColumn()
	id!: number;

	@Field(() => String)
	@CreateDateColumn()
	createdAt: Date;

	@Field(() => String)
	@UpdateDateColumn()
	updatedAt: Date;

	@Field()
	@Column({
		type: "int",
		nullable: true,
	})
	rank: number;

	@Field(() => String)
	@Column({ type: "text" })
	question!: string;

	@Field(() => Int)
	@Column("int", { default: 0 })
	points!: number;

	@Field(() => String)
	@Column({ type: "text" })
	fileKey: string;

	@Field(() => Int)
	@Column("int", { default: 0 })
	updates!: number;

	@Field()
	@Column()
	creatorId: number;

	@ManyToOne(() => User, (user) => user.submissions)
	@JoinColumn()
	creator: User;
}
