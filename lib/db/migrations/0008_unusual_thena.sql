CREATE TABLE IF NOT EXISTS "Model" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"provider" varchar(64) NOT NULL,
	"description" text,
	"modelType" varchar(32),
	"contextWindow" integer,
	"pricingInput" real,
	"pricingOutput" real,
	"isEnabled" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Chat" DROP COLUMN IF EXISTS "lastContext";