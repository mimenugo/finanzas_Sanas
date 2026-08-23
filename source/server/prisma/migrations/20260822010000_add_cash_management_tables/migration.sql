-- CreateTable
CREATE TABLE `cash-boxes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `balance` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `cash-boxes_status_idx`(`status`),
    INDEX `cash-boxes_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cash-movements` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cashId` INTEGER NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `concept` TEXT NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `observations` TEXT NULL,
    `reference` VARCHAR(191) NULL,
    `relatadId` VARCHAR(191) NULL,
    `relatadType` VARCHAR(191) NULL,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `cash-movements_cashId_type_idx`(`cashId`, `type`),
    INDEX `cash-movements_createdAt_idx`(`createdAt`),
    INDEX `cash-movements_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cash-transfers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fromCashId` INTEGER NOT NULL,
    `toCashId` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `reason` TEXT NULL,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `cash-transfers_fromCashId_idx`(`fromCashId`),
    INDEX `cash-transfers_toCashId_idx`(`toCashId`),
    INDEX `cash-transfers_userId_idx`(`userId`),
    INDEX `cash-transfers_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cash-closures` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cashId` INTEGER NOT NULL,
    `closureDate` DATETIME(3) NOT NULL,
    `initialBalance` DECIMAL(10, 2) NOT NULL,
    `totalIncome` DECIMAL(10, 2) NOT NULL,
    `totalExpense` DECIMAL(10, 2) NOT NULL,
    `theoreticalBalance` DECIMAL(10, 2) NOT NULL,
    `physicalBalance` DECIMAL(10, 2) NOT NULL,
    `difference` DECIMAL(10, 2) NOT NULL,
    `observations` TEXT NULL,
    `denominations` JSON NULL,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `cash-closures_cashId_idx`(`cashId`),
    INDEX `cash-closures_userId_idx`(`userId`),
    INDEX `cash-closures_closureDate_idx`(`closureDate`),
    INDEX `cash-closures_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `cash-movements` ADD CONSTRAINT `cash-movements_cashId_fkey` FOREIGN KEY (`cashId`) REFERENCES `cash-boxes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `cash-movements` ADD CONSTRAINT `cash-movements_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `cash-transfers` ADD CONSTRAINT `cash-transfers_fromCashId_fkey` FOREIGN KEY (`fromCashId`) REFERENCES `cash-boxes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `cash-transfers` ADD CONSTRAINT `cash-transfers_toCashId_fkey` FOREIGN KEY (`toCashId`) REFERENCES `cash-boxes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `cash-transfers` ADD CONSTRAINT `cash-transfers_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `cash-closures` ADD CONSTRAINT `cash-closures_cashId_fkey` FOREIGN KEY (`cashId`) REFERENCES `cash-boxes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `cash-closures` ADD CONSTRAINT `cash-closures_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
