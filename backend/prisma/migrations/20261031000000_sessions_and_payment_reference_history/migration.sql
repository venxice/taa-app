ALTER TABLE `User`
    ADD COLUMN `tokenVersion` INTEGER NOT NULL DEFAULT 0;

CREATE TABLE `PaymentReference` (
    `id` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(191) NOT NULL,
    `paymentId` VARCHAR(191) NOT NULL,
    `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),
    UNIQUE INDEX `PaymentReference_reference_key`(`reference`),
    INDEX `PaymentReference_paymentId_idx`(`paymentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT IGNORE INTO `PaymentReference` (`id`, `reference`, `paymentId`, `submittedAt`)
SELECT UUID(), COALESCE(NULLIF(`receiptNumber`, ''), NULLIF(`proofOfPayment`, '')),
       `id`, COALESCE(`paymentDate`, `updatedAt`)
FROM `Payment`
WHERE COALESCE(NULLIF(`receiptNumber`, ''), NULLIF(`proofOfPayment`, '')) IS NOT NULL;
