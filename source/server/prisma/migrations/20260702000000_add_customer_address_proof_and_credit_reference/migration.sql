ALTER TABLE `Customer`
  ADD COLUMN `addressProofType` VARCHAR(191) NULL,
  ADD COLUMN `addressProofIssuedAt` DATETIME(3) NULL,
  ADD COLUMN `addressProofFileUrl` VARCHAR(191) NULL,
  ADD COLUMN `addressProofFileName` VARCHAR(191) NULL,
  ADD COLUMN `addressProofFileMimeType` VARCHAR(191) NULL,
  ADD COLUMN `addressProofFileSize` INTEGER NULL,
  ADD COLUMN `addressProofFileStorage` VARCHAR(191) NULL,
  ADD COLUMN `addressProofGoogleDriveFileId` VARCHAR(191) NULL,
  ADD COLUMN `creditReferenceCustomerId` INTEGER NULL;

CREATE INDEX `Customer_creditReferenceCustomerId_idx` ON `Customer`(`creditReferenceCustomerId`);

ALTER TABLE `Customer`
  ADD CONSTRAINT `Customer_creditReferenceCustomerId_fkey`
  FOREIGN KEY (`creditReferenceCustomerId`) REFERENCES `Customer`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
