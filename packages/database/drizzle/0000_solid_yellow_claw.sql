CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"publicAddress" varchar(255),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_publicAddress_unique" UNIQUE("publicAddress")
);
