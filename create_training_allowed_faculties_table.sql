CREATE TABLE IF NOT EXISTS `training_allowed_faculties` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `training_id` bigint(20) unsigned NOT NULL,
  `faculty_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `training_allowed_faculties_training_id_foreign` (`training_id`),
  KEY `training_allowed_faculties_faculty_id_foreign` (`faculty_id`),
  CONSTRAINT `training_allowed_faculties_training_id_foreign` FOREIGN KEY (`training_id`) REFERENCES `trainings` (`training_id`) ON DELETE CASCADE,
  CONSTRAINT `training_allowed_faculties_faculty_id_foreign` FOREIGN KEY (`faculty_id`) REFERENCES `faculties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;






