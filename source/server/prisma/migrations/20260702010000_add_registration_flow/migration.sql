ALTER TABLE `Customer`
  ADD COLUMN `registrationStatus` VARCHAR(191) NULL DEFAULT 'APPROVED',
  ADD COLUMN `registeredAt` DATETIME(3) NULL,
  ADD COLUMN `biometricStatus` VARCHAR(191) NULL DEFAULT 'PENDING',
  ADD COLUMN `photoCapturedAt` DATETIME(3) NULL,
  ADD COLUMN `livenessPhotoUrl` VARCHAR(191) NULL,
  ADD COLUMN `livenessPhotoName` VARCHAR(191) NULL,
  ADD COLUMN `livenessPhotoMimeType` VARCHAR(191) NULL,
  ADD COLUMN `livenessPhotoSize` INTEGER NULL,
  ADD COLUMN `livenessCapturedAt` DATETIME(3) NULL,
  ADD COLUMN `livenessScore` DECIMAL(5, 2) NULL,
  ADD COLUMN `livenessNotes` TEXT NULL;

CREATE TABLE `registration_links` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `tokenHash` VARCHAR(191) NOT NULL,
  `purpose` VARCHAR(191) NOT NULL DEFAULT 'CLIENT',
  `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
  `requireGuarantor` BOOLEAN NOT NULL DEFAULT false,
  `customerId` INTEGER NULL,
  `guarantorForCustomerId` INTEGER NULL,
  `progress` JSON NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `createdBy` INTEGER NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `registration_links_tokenHash_key`(`tokenHash`),
  INDEX `registration_links_status_idx`(`status`),
  INDEX `registration_links_expiresAt_idx`(`expiresAt`),
  INDEX `registration_links_customerId_idx`(`customerId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
