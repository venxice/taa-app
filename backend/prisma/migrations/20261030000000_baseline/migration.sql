-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `middleName` VARCHAR(191) NULL DEFAULT '',
    `lastName` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `username` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('resident', 'hoa_officer', 'admin') NOT NULL DEFAULT 'resident',
    `status` ENUM('pending', 'verified', 'rejected', 'suspended', 'disabled') NOT NULL DEFAULT 'pending',
    `phone` VARCHAR(191) NULL DEFAULT '',
    `avatar` VARCHAR(191) NULL DEFAULT '',
    `avatarPath` VARCHAR(191) NULL DEFAULT '',
    `verifiedById` VARCHAR(191) NULL,
    `verifiedAt` DATETIME(3) NULL,
    `rejectionReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_username_key`(`username`),
    INDEX `User_role_idx`(`role`),
    INDEX `User_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Resident` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `residenceId` VARCHAR(191) NULL,
    `birthDate` DATETIME(3) NULL,
    `birthPlace` VARCHAR(191) NULL DEFAULT '',
    `age` INTEGER NULL,
    `gender` VARCHAR(191) NULL DEFAULT '',
    `civilStatus` VARCHAR(191) NULL DEFAULT '',
    `religion` VARCHAR(191) NULL DEFAULT '',
    `nationality` VARCHAR(191) NULL DEFAULT '',
    `alias` VARCHAR(191) NULL DEFAULT '',
    `email` VARCHAR(191) NULL DEFAULT '',
    `phone` VARCHAR(191) NULL DEFAULT '',
    `houseNumber` VARCHAR(191) NULL DEFAULT '',
    `street` VARCHAR(191) NULL DEFAULT '',
    `purok` VARCHAR(191) NULL DEFAULT '',
    `barangay` VARCHAR(191) NULL DEFAULT '',
    `municipality` VARCHAR(191) NULL DEFAULT '',
    `zipCode` VARCHAR(191) NULL DEFAULT '',
    `address` TEXT NULL,
    `householdRole` VARCHAR(191) NULL DEFAULT '',
    `householdSize` INTEGER NULL,
    `fatherName` VARCHAR(191) NULL DEFAULT '',
    `motherName` VARCHAR(191) NULL DEFAULT '',
    `guardian` VARCHAR(191) NULL DEFAULT '',
    `guardianPhone` VARCHAR(191) NULL DEFAULT '',
    `occupation` VARCHAR(191) NULL DEFAULT '',
    `employerName` VARCHAR(191) NULL DEFAULT '',
    `bloodType` VARCHAR(191) NULL DEFAULT '',
    `isSenior` BOOLEAN NOT NULL DEFAULT false,
    `isPWD` BOOLEAN NOT NULL DEFAULT false,
    `pwdInfo` VARCHAR(191) NULL DEFAULT '',
    `isSingleParent` BOOLEAN NOT NULL DEFAULT false,
    `isVoter` BOOLEAN NOT NULL DEFAULT false,
    `is4Ps` BOOLEAN NOT NULL DEFAULT false,
    `isWRA` BOOLEAN NOT NULL DEFAULT false,
    `emergencyContactName` VARCHAR(191) NULL DEFAULT '',
    `emergencyContactPhone` VARCHAR(191) NULL DEFAULT '',
    `emergencyContactRelation` VARCHAR(191) NULL DEFAULT '',
    `avatar` VARCHAR(191) NULL DEFAULT '',
    `avatarPath` VARCHAR(191) NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Resident_userId_key`(`userId`),
    UNIQUE INDEX `Resident_residenceId_key`(`residenceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Announcement` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `isPublished` BOOLEAN NOT NULL DEFAULT false,
    `isPinned` BOOLEAN NOT NULL DEFAULT false,
    `imageUrl` VARCHAR(191) NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Announcement_isPublished_idx`(`isPublished`),
    INDEX `Announcement_isPinned_idx`(`isPinned`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Incident` (
    `id` VARCHAR(191) NOT NULL,
    `incidentType` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `location` TEXT NOT NULL,
    `dateIncident` DATETIME(3) NOT NULL,
    `dateReported` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reportedById` VARCHAR(191) NULL,
    `residentId` VARCHAR(191) NULL,
    `complainantName` VARCHAR(191) NULL DEFAULT '',
    `complainantContact` VARCHAR(191) NULL DEFAULT '',
    `respondentName` VARCHAR(191) NULL DEFAULT '',
    `involvedPerson` VARCHAR(191) NULL DEFAULT '',
    `status` ENUM('pending', 'investigating', 'resolved', 'rejected') NOT NULL DEFAULT 'pending',
    `remarks` TEXT NULL,
    `actionTaken` TEXT NULL,
    `resolvedAt` DATETIME(3) NULL,
    `handledById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Incident_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` VARCHAR(191) NOT NULL,
    `residentId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `dueDate` DATETIME(3) NOT NULL,
    `paymentDate` DATETIME(3) NULL,
    `status` ENUM('pending', 'confirmed', 'rejected', 'overdue') NOT NULL DEFAULT 'pending',
    `receiptNumber` VARCHAR(191) NULL,
    `proofOfPayment` VARCHAR(191) NULL DEFAULT '',
    `proofOfPaymentPath` VARCHAR(191) NULL DEFAULT '',
    `verifiedById` VARCHAR(191) NULL,
    `verifiedAt` DATETIME(3) NULL,
    `rejectionReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Payment_receiptNumber_key`(`receiptNumber`),
    INDEX `Payment_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NOT NULL,
    `entity` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `details` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_entity_entityId_createdAt_idx`(`entity`, `entityId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FinanceEntry` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('income', 'expense') NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NULL,
    `description` TEXT NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `entryDate` DATETIME(3) NOT NULL,
    `recordedById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FinanceEntry_type_entryDate_idx`(`type`, `entryDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FinanceSetting` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'global',
    `duesSuspended` BOOLEAN NOT NULL DEFAULT false,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Official` (
    `id` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `middleName` VARCHAR(191) NULL DEFAULT '',
    `lastName` VARCHAR(191) NOT NULL,
    `suffix` VARCHAR(191) NULL DEFAULT '',
    `position` VARCHAR(191) NOT NULL,
    `positionOrder` INTEGER NOT NULL DEFAULT 0,
    `termFrom` DATETIME(3) NULL,
    `termTo` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `birthDate` DATETIME(3) NULL,
    `gender` VARCHAR(191) NULL DEFAULT '',
    `contactNumber` VARCHAR(191) NULL DEFAULT '',
    `email` VARCHAR(191) NULL DEFAULT '',
    `address` TEXT NULL,
    `avatar` VARCHAR(191) NULL DEFAULT '',
    `avatarPath` VARCHAR(191) NULL DEFAULT '',
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Official_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_verifiedById_fkey` FOREIGN KEY (`verifiedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Resident` ADD CONSTRAINT `Resident_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Announcement` ADD CONSTRAINT `Announcement_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Incident` ADD CONSTRAINT `Incident_reportedById_fkey` FOREIGN KEY (`reportedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Incident` ADD CONSTRAINT `Incident_residentId_fkey` FOREIGN KEY (`residentId`) REFERENCES `Resident`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Incident` ADD CONSTRAINT `Incident_handledById_fkey` FOREIGN KEY (`handledById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_residentId_fkey` FOREIGN KEY (`residentId`) REFERENCES `Resident`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_verifiedById_fkey` FOREIGN KEY (`verifiedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinanceEntry` ADD CONSTRAINT `FinanceEntry_recordedById_fkey` FOREIGN KEY (`recordedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Official` ADD CONSTRAINT `Official_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
