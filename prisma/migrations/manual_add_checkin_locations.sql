CREATE TABLE IF NOT EXISTS `checkin_locations` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `allowed_tiers` VARCHAR(255) NOT NULL,
  `image_url` TEXT DEFAULT NULL,
  `prerequisite` VARCHAR(255) DEFAULT NULL,
  `nc_order` DECIMAL(10,2) DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default locations to migrate from STAFF_CHECKIN_ZONES
INSERT INTO `checkin_locations` (`id`, `name`, `allowed_tiers`, `image_url`, `prerequisite`, `nc_order`) VALUES 
(1, 'Cổng vào', 'GOLD,RUBY,VIP', 'https://beautysummit.vn/wp-content/uploads/2026/02/thumbnail.jpg', NULL, 1),
(2, 'Phòng Coach 1:1', 'RUBY,VIP', 'https://beautysummit.vn/wp-content/uploads/2026/02/thumbnail.jpg', '1', 2),
(3, 'Phòng hội thảo', 'VIP', 'https://beautysummit.vn/wp-content/uploads/2026/02/thumbnail.jpg', '1', 3);
