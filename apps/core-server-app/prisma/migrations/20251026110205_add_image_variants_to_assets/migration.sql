-- AlterTable
ALTER TABLE "public"."assets" ADD COLUMN     "aspect_ratio" VARCHAR(10),
ADD COLUMN     "medium_path" VARCHAR(500),
ADD COLUMN     "thumbnail_path" VARCHAR(500);
