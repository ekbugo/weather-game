-- DropForeignKey
ALTER TABLE "weekly_schedule" DROP CONSTRAINT "weekly_schedule_station_id_fkey";

-- DropTable
DROP TABLE "weekly_schedule";
