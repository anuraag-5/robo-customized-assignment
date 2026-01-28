CREATE TABLE "users_chat" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"prompts" text DEFAULT '[]' NOT NULL,
	"answers" text DEFAULT '[]' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users_image" (
	"id" varchar PRIMARY KEY NOT NULL,
	"users_chat_id" varchar NOT NULL,
	"user_id" text NOT NULL,
	"image" text DEFAULT '[]' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users_chat" ADD CONSTRAINT "users_chat_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_image" ADD CONSTRAINT "users_image_users_chat_id_users_chat_id_fk" FOREIGN KEY ("users_chat_id") REFERENCES "public"."users_chat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_image" ADD CONSTRAINT "users_image_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "usersChat_userId_idx" ON "users_chat" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "usersImage_usersChatId_idx" ON "users_image" USING btree ("users_chat_id");--> statement-breakpoint
CREATE INDEX "usersImage_userId_idx" ON "users_image" USING btree ("user_id");