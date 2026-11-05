-- CreateTable
CREATE TABLE `game_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `nama_pemain` VARCHAR(50) NULL,
    `division_id` INTEGER NOT NULL,
    `questions` JSON NOT NULL,
    `answers` JSON NULL,
    `current_index` INTEGER NOT NULL DEFAULT 0,
    `question_started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `skor` INTEGER NOT NULL DEFAULT 0,
    `selesai` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `game_sessions_division_id_skor_idx`(`division_id`, `skor`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `game_sessions` ADD CONSTRAINT `game_sessions_division_id_fkey` FOREIGN KEY (`division_id`) REFERENCES `divisions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
