-- CreateTable
CREATE TABLE `customer_disbursement_accounts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customerId` INTEGER NOT NULL,
    `bank` VARCHAR(191) NOT NULL,
    `accountHolder` VARCHAR(191) NOT NULL,
    `destinationType` VARCHAR(191) NOT NULL DEFAULT 'CLABE',
    `clabeEncrypted` TEXT NOT NULL,
    `destinationLast4` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `consentAt` DATETIME(3) NOT NULL,
    `verifiedAt` DATETIME(3) NULL,
    `verifiedById` INTEGER NULL,
    `verificationNotes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `customer_disbursement_accounts_customerId_status_idx`(`customerId`, `status`),
    INDEX `customer_disbursement_accounts_customerId_isPrimary_idx`(`customerId`, `isPrimary`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loan_disbursements` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `loanId` INTEGER NOT NULL,
    `customerId` INTEGER NOT NULL,
    `disbursementAccountId` INTEGER NULL,
    `cashId` INTEGER NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `method` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `reference` VARCHAR(191) NOT NULL,
    `providerTransactionId` VARCHAR(191) NULL,
    `initiatedById` INTEGER NOT NULL,
    `sentAt` DATETIME(3) NULL,
    `confirmedAt` DATETIME(3) NULL,
    `returnedAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `loan_disbursements_loanId_key`(`loanId`),
    UNIQUE INDEX `loan_disbursements_reference_key`(`reference`),
    INDEX `loan_disbursements_customerId_idx`(`customerId`),
    INDEX `loan_disbursements_disbursementAccountId_idx`(`disbursementAccountId`),
    INDEX `loan_disbursements_status_idx`(`status`),
    INDEX `loan_disbursements_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- RedefineTable
ALTER TABLE `Loan` ADD COLUMN `disbursementAccountId` INTEGER NULL;
CREATE INDEX `Loan_disbursementAccountId_idx` ON `Loan`(`disbursementAccountId`);

-- AddForeignKey
ALTER TABLE `customer_disbursement_accounts` ADD CONSTRAINT `customer_disbursement_accounts_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Loan` ADD CONSTRAINT `Loan_disbursementAccountId_fkey` FOREIGN KEY (`disbursementAccountId`) REFERENCES `customer_disbursement_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `loan_disbursements` ADD CONSTRAINT `loan_disbursements_loanId_fkey` FOREIGN KEY (`loanId`) REFERENCES `Loan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `loan_disbursements` ADD CONSTRAINT `loan_disbursements_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `loan_disbursements` ADD CONSTRAINT `loan_disbursements_disbursementAccountId_fkey` FOREIGN KEY (`disbursementAccountId`) REFERENCES `customer_disbursement_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
