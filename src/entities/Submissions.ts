import { Field, Int, ObjectType } from "type-graphql";
import {
	BaseEntity,
	Column,
	CreateDateColumn,
	Entity,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from "typeorm";

// // export type Week = 1 | 2 | 3 | 4;
// export type Question = 1 | 2 | 3;
// export type Part = "A" | "B" | "C" | "D";

// export enum Week {
// 	A,
// 	B,
// 	C,
// }

@ObjectType()
@Entity()
export class Submissions extends BaseEntity {
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
	username!: string;

	@Field()
	@Column({
		type: "int",
		// select: false,
		// insert: false,
		// readonly: true,
		nullable: true,
	})
	rank: number;
	// @Field()
	// @Column({ type: "enum", enum: [1, 2, 3, 4], default: 1 })
	// week!: Week;

	// @Field()
	// @Column({ type: "enum", enum: Week })
	// week!: Week;

	// @Field()
	// @Column({ type: "enum", enum: [1, 2, 3], default: 1 })
	// question!: Question;

	// @Field()
	// @Column({ type: "enum", enum: ["a", "b", "c", "d"], default: "a" })
	// part!: Part;

	@Field(() => Int)
	@Column("int")
	week!: number;

	@Field(() => Int)
	@Column("int")
	question!: number;

	@Field(() => String)
	@Column({ type: "text" })
	part!: string;

	@Field(() => Int)
	@Column("int", { default: 0 })
	points!: number;

	@Field(() => Int)
	@Column("int", { default: 0 })
	updates!: number;
}
