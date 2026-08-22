CREATE TABLE `payment_settings` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `key` VARCHAR(191) NOT NULL,
  `value` TEXT NOT NULL,
  `category` VARCHAR(191) NOT NULL DEFAULT 'general',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `payment_settings_key_key`(`key`),
  INDEX `payment_settings_category_idx`(`category`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `payment_method_configs` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `icon` VARCHAR(191) NULL,
  `providerCode` VARCHAR(191) NULL,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `feeType` VARCHAR(191) NOT NULL DEFAULT 'FIXED',
  `feeValue` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `feePaidBy` VARCHAR(191) NOT NULL DEFAULT 'COMPANY',
  `minAmount` DECIMAL(10, 2) NULL,
  `maxAmount` DECIMAL(10, 2) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `payment_method_configs_code_key`(`code`),
  INDEX `payment_method_configs_active_idx`(`active`),
  INDEX `payment_method_configs_sortOrder_idx`(`sortOrder`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `bank_accounts` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `bank` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `accountHolder` VARCHAR(191) NOT NULL,
  `accountNumber` VARCHAR(191) NULL,
  `clabe` VARCHAR(191) NULL,
  `cardNumber` VARCHAR(191) NULL,
  `branch` VARCHAR(191) NULL,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'MXN',
  `accountType` VARCHAR(191) NOT NULL,
  `isPrimary` BOOLEAN NOT NULL DEFAULT false,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `color` VARCHAR(191) NULL,
  `logoUrl` VARCHAR(191) NULL,
  `useSpei` BOOLEAN NOT NULL DEFAULT false,
  `useDeposits` BOOLEAN NOT NULL DEFAULT false,
  `useReferences` BOOLEAN NOT NULL DEFAULT false,
  `useTransfers` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `bank_accounts_active_idx`(`active`),
  INDEX `bank_accounts_isPrimary_idx`(`isPrimary`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `payment_provider_configs` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `mode` VARCHAR(191) NOT NULL DEFAULT 'SANDBOX',
  `active` BOOLEAN NOT NULL DEFAULT false,
  `credentials` JSON NULL,
  `webhookUrls` JSON NULL,
  `settings` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `payment_provider_configs_code_key`(`code`),
  INDEX `payment_provider_configs_active_idx`(`active`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `payment_references` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `loanId` INTEGER NOT NULL,
  `customerId` INTEGER NOT NULL,
  `methodId` INTEGER NOT NULL,
  `bankAccountId` INTEGER NULL,
  `reference` VARCHAR(191) NOT NULL,
  `barcode` VARCHAR(191) NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `fee` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
  `expiresAt` DATETIME(3) NOT NULL,
  `confirmedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `payment_references_reference_key`(`reference`),
  INDEX `payment_references_loanId_idx`(`loanId`),
  INDEX `payment_references_customerId_idx`(`customerId`),
  INDEX `payment_references_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `payment_transactions` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `folio` VARCHAR(191) NOT NULL,
  `loanId` INTEGER NULL,
  `customerId` INTEGER NULL,
  `paymentId` INTEGER NULL,
  `methodId` INTEGER NULL,
  `providerId` INTEGER NULL,
  `bankAccountId` INTEGER NULL,
  `cashId` INTEGER NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `fee` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
  `providerTransactionId` VARCHAR(191) NULL,
  `authorizationNumber` VARCHAR(191) NULL,
  `reference` VARCHAR(191) NULL,
  `ipAddress` VARCHAR(191) NULL,
  `device` VARCHAR(191) NULL,
  `browser` VARCHAR(191) NULL,
  `providerResponse` JSON NULL,
  `notes` TEXT NULL,
  `createdBy` INTEGER NULL,
  `confirmedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `payment_transactions_folio_key`(`folio`),
  INDEX `payment_transactions_loanId_idx`(`loanId`),
  INDEX `payment_transactions_customerId_idx`(`customerId`),
  INDEX `payment_transactions_status_idx`(`status`),
  INDEX `payment_transactions_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `payment_references` ADD CONSTRAINT `payment_references_loanId_fkey` FOREIGN KEY (`loanId`) REFERENCES `Loan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `payment_references` ADD CONSTRAINT `payment_references_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `payment_references` ADD CONSTRAINT `payment_references_methodId_fkey` FOREIGN KEY (`methodId`) REFERENCES `payment_method_configs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `payment_references` ADD CONSTRAINT `payment_references_bankAccountId_fkey` FOREIGN KEY (`bankAccountId`) REFERENCES `bank_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `payment_transactions` ADD CONSTRAINT `payment_transactions_loanId_fkey` FOREIGN KEY (`loanId`) REFERENCES `Loan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `payment_transactions` ADD CONSTRAINT `payment_transactions_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `payment_transactions` ADD CONSTRAINT `payment_transactions_methodId_fkey` FOREIGN KEY (`methodId`) REFERENCES `payment_method_configs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `payment_transactions` ADD CONSTRAINT `payment_transactions_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `payment_provider_configs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `payment_transactions` ADD CONSTRAINT `payment_transactions_bankAccountId_fkey` FOREIGN KEY (`bankAccountId`) REFERENCES `bank_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
