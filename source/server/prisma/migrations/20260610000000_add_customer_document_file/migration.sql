ALTER TABLE `Customer`
  ADD COLUMN `documentFileUrl` VARCHAR(191) NULL,
  ADD COLUMN `documentFileName` VARCHAR(191) NULL,
  ADD COLUMN `documentFileMimeType` VARCHAR(191) NULL,
  ADD COLUMN `documentFileSize` INTEGER NULL,
  ADD COLUMN `documentFileStorage` VARCHAR(191) NULL,
  ADD COLUMN `googleDriveFileId` VARCHAR(191) NULL;
