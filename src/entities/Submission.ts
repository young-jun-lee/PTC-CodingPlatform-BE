import { Field, Int, ObjectType } from "type-graphql";
import {
	BaseEntity,
	Column,
	CreateDateColumn,
	Entity,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from "typeorm";

@ObjectType()
@Entity()
export class Submission extends BaseEntity {
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
	@Column({ type: "text" })
	filename!: string;

	@Field()
	@Column({ type: "text", unique: true })
	mimetype!: string;

	@Column({ type: "text" })
	encoding!: string;
}
