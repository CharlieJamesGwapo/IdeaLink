-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 27, 2026 at 12:57 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `suggestion_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `accounting_accounts`
--

CREATE TABLE `accounting_accounts` (
  `id` int(11) UNSIGNED NOT NULL,
  `username` varchar(50) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `accounting_accounts`
--

INSERT INTO `accounting_accounts` (`id`, `username`, `password`) VALUES
(1, 'accounting', 'acct123');

-- --------------------------------------------------------

--
-- Table structure for table `admin_accounts`
--

CREATE TABLE `admin_accounts` (
  `id` int(11) UNSIGNED NOT NULL,
  `fullname` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `date_created` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admin_accounts`
--

INSERT INTO `admin_accounts` (`id`, `fullname`, `email`, `password`, `date_created`) VALUES
(1, 'Administrator', 'admin@gmail.com', 'admin123', '2025-11-27 09:38:40');

-- --------------------------------------------------------

--
-- Table structure for table `announcements`
--

CREATE TABLE `announcements` (
  `id` int(11) NOT NULL,
  `admin_id` int(11) UNSIGNED DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `date_posted` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `announcements`
--

INSERT INTO `announcements` (`id`, `admin_id`, `title`, `message`, `date_posted`) VALUES
(23, NULL, 'Closing the Semester Strong', 'As we approach the end of the term, we want to hear your thoughts on how we can improve the enrollment process for next semester. Submit your suggestions under the \"Registrar\" category today!', '2026-02-17 08:03:16'),
(24, NULL, 'Policy Reminder', 'To ensure a productive environment, please remember to keep all suggestions constructive and respectful. Let’s focus on solutions that benefit the entire student body and staff.', '2026-02-17 08:03:45'),
(25, NULL, 'Call for Innovations!', 'We are looking for the most impactful suggestion of the month. The best idea related to \"Campus Sustainability\" will be featured on our homepage and discussed in the next board meeting!', '2026-02-17 08:04:12'),
(26, NULL, 'Use IdeaLink on the Go!', 'Did you know IdeaLink is fully mobile-responsive? You can submit suggestions and check announcements directly from your smartphone browser anytime, anywhere.', '2026-02-17 08:04:36'),
(27, NULL, 'System Maintenance Notice', 'IdeaLink will undergo brief scheduled maintenance this Saturday from 10:00 PM to 12:00 AM. The portal will be temporarily unavailable during this window. Thank you for your patience.', '2026-02-17 08:05:02'),
(28, NULL, 'Accounting Office: New Inquiry Window', 'To better serve student concerns regarding tuition and fees, the Accounting Office has extended its afternoon consultation hours until 5:00 PM every Tuesday and Thursday.', '2026-02-17 08:05:33'),
(29, NULL, 'Improvements to Document Requesting', 'Based on recent user suggestions, the Registrar’s Office has streamlined the online request process for Transcripts and Certifications. Expect faster turnaround times starting this week!', '2026-02-17 08:05:57'),
(30, NULL, 'Your Ideas in Action!', 'Check out our new Testimonials section! We’ve started featuring suggestions that have been successfully implemented. Thank you to everyone contributing to the growth of our institution.', '2026-02-17 08:06:30'),
(31, NULL, 'Privacy First: Anonymous Suggestions', 'Just a reminder that you can submit suggestions anonymously by toggling the \"Post Anonymously\" switch. We value your honest feedback and want you to feel comfortable sharing your thoughts.', '2026-02-17 08:07:18'),
(36, NULL, 'Welcome to our New Suggestion Portal!', 'We are excited to launch IdeaLink! This is your dedicated space to share innovative ideas, feedback, and suggestions to help improve our campus services. Your voice matters—let’s build a better community together.', '2026-02-18 22:44:18');

-- --------------------------------------------------------

--
-- Table structure for table `registrar_accounts`
--

CREATE TABLE `registrar_accounts` (
  `id` int(11) UNSIGNED NOT NULL,
  `username` varchar(50) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `registrar_accounts`
--

INSERT INTO `registrar_accounts` (`id`, `username`, `password`) VALUES
(1, 'registrar', 'registrar123');

-- --------------------------------------------------------

--
-- Table structure for table `suggestions`
--

CREATE TABLE `suggestions` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `registrar_id` int(11) UNSIGNED DEFAULT NULL,
  `accounting_id` int(11) UNSIGNED DEFAULT NULL,
  `admin_id` int(11) UNSIGNED DEFAULT NULL,
  `department` varchar(255) NOT NULL,
  `user_role` varchar(50) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `date_submitted` datetime DEFAULT current_timestamp(),
  `status` varchar(50) DEFAULT 'Pending',
  `anonymous` tinyint(1) DEFAULT 0,
  `is_read` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `suggestions`
--

INSERT INTO `suggestions` (`id`, `user_id`, `registrar_id`, `accounting_id`, `admin_id`, `department`, `user_role`, `title`, `description`, `date_submitted`, `status`, `anonymous`, `is_read`) VALUES
(14, 4, NULL, NULL, NULL, 'Registrar', NULL, 'TOR difficulty ', 'Could we have an automated email notification when our requested Transcript of Records (TOR) is ready for pickup? Currently, we have to keep coming back to check.', '2026-02-17 08:11:56', 'Reviewed', 0, 0),
(15, 4, NULL, NULL, NULL, 'Accounting Office', NULL, 'Miscellaneous Fees', 'Can the Accounting Office provide a breakdown of \'Miscellaneous Fees\' on the student portal? It’s hard to understand what exactly we are paying for.', '2026-02-17 08:13:02', 'Reviewed', 1, 0),
(16, 3, NULL, NULL, NULL, 'Accounting Office', NULL, 'Certificates', 'The request form for certifications should be downloadable as a PDF so we can fill it out before arriving at the window.', '2026-02-17 08:16:00', 'Pending', 0, 0),
(17, 3, NULL, NULL, NULL, 'Accounting Office', NULL, 'Flexible Payment Method', 'Please consider adding an G-Cash or Maya payment option for tuition. The bank lines are too long during prelims.', '2026-02-17 08:16:45', 'Reviewed', 1, 0),
(18, 3, NULL, NULL, NULL, 'Accounting Office', NULL, 'Error Balance Fixed', 'I reported an error in my balance through IdeaLink, and the Accounting office corrected it within 24 hours. Very efficient', '2026-02-17 08:18:31', 'Reviewed', 0, 1),
(19, 5, NULL, NULL, NULL, 'Registrar', NULL, 'Diploma Release Schedule', 'Can the Registrar post a specific schedule for diploma releases by batch on the website? The current \'first come, first served\' approach creates a massive crowd.', '2026-02-17 08:22:46', 'Reviewed', 1, 0),
(20, 5, NULL, NULL, NULL, 'Registrar', NULL, 'Course Description Archive', 'For students transferring out or applying abroad, we need old course descriptions. Could the Registrar digitize the catalogs from 2010–2020 for easier access?', '2026-02-17 08:26:16', 'Pending', 0, 1),
(21, 5, NULL, NULL, NULL, 'Accounting Office', NULL, 'Partial Payment SMS Alerts', 'Can the system send an SMS reminder 3 days before a partial payment installment is due? Sometimes we forget the exact date and incur late fees', '2026-02-17 08:27:06', 'Reviewed', 0, 1),
(22, 2, NULL, NULL, NULL, 'Accounting Office', NULL, 'Refund Progress Tracker', 'When we overpay or a class is dissolved, the refund process is a mystery. We need a way to see where our refund voucher is currently being processed', '2026-02-17 08:45:35', 'Reviewed', 0, 0),
(23, 2, NULL, NULL, NULL, 'Accounting Office', NULL, 'Clearance Validation Window', 'During enrollment, can there be a dedicated \'Express Window\' just for students who have zero balance to get their clearance validated quickly?', '2026-02-17 08:46:50', 'Reviewed', 1, 0),
(24, 2, NULL, NULL, NULL, 'Registrar', NULL, 'Success Stories', 'The shift to digital document stamps has saved me so much time. I used to wait hours just for a seal; now it\'s done instantly upon pick-up.', '2026-02-17 08:48:17', 'Pending', 0, 0),
(25, 6, NULL, NULL, NULL, 'Registrar', NULL, 'ID Replacement Process', 'Can we have a clearer step-by-step guide for lost IDs? Perhaps an online form where we upload the Affidavit of Loss.', '2026-02-17 08:52:01', 'Pending', 0, 0),
(26, 6, NULL, NULL, NULL, 'Registrar', NULL, 'Benches Please', 'I suggested more benches near the Registrar\'s office last month, and they actually installed them! It feels good to know our voices are heard.', '2026-02-17 08:54:46', 'Reviewed', 0, 0),
(27, 6, NULL, NULL, NULL, 'Accounting Office', NULL, 'New Payment Method', 'The new online payment system is a lifesaver! No more spending 4 hours in the sun just to pay for my midterms. Thank you!', '2026-02-17 09:14:45', 'Reviewed', 0, 0),
(28, 5, NULL, NULL, NULL, 'Registrar', NULL, 'Organize Document', 'Requesting documents has never been this organized. The status updates keep me from constantly asking at the window. Great improvement!', '2026-02-17 09:17:50', 'Reviewed', 0, 0),
(29, 2, NULL, NULL, NULL, 'Accounting Office', 'Student', 'Hoping makita ni database', 'Makita tana niya', '2026-03-03 22:16:01', 'Reviewed', 0, 1),
(30, 6, NULL, NULL, NULL, 'Accounting Office', 'Faculty Staff', 'E automate ang paycheck ', 'Instead na permi slip lang I want my paycheck to go directly on my bank account.', '2026-03-03 22:28:59', 'Reviewed', 0, 1),
(31, 2, NULL, NULL, NULL, 'Registrar', 'Student', 'Notif', 'Trying new notif', '2026-03-20 20:44:28', 'Pending', 0, 0);

-- --------------------------------------------------------

--
-- Table structure for table `testimonials`
--

CREATE TABLE `testimonials` (
  `id` int(11) NOT NULL,
  `suggestion_id` int(11) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `department` varchar(100) DEFAULT NULL,
  `message` text NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `testimonials`
--

INSERT INTO `testimonials` (`id`, `suggestion_id`, `name`, `department`, `message`, `is_active`, `created_at`) VALUES
(10, 18, 'Roselle Pabulario', 'Accounting Office', 'I reported an error in my balance through IdeaLink, and the Accounting office corrected it within 24 hours. Very efficient', 1, '2026-02-17 01:10:02'),
(14, 27, 'Ricky Salada', 'Accounting Office', 'The new online payment system is a lifesaver! No more spending 4 hours in the sun just to pay for my midterms. Thank you!', 1, '2026-02-17 01:15:19'),
(15, 28, 'Peejay Morado', 'Registrar', 'Requesting documents has never been this organized. The status updates keep me from constantly asking at the window. Great improvement!', 1, '2026-02-17 01:18:03'),
(17, 24, 'Aira Nudalo', 'Registrar', 'The shift to digital document stamps has saved me so much time. I used to wait hours just for a seal; now it\'s done instantly upon pick-up.', 1, '2026-03-03 03:14:07');

-- --------------------------------------------------------

--
-- Table structure for table `user_accounts`
--

CREATE TABLE `user_accounts` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `fullname` varchar(255) NOT NULL,
  `date_created` datetime DEFAULT current_timestamp(),
  `last_announcement_view` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_accounts`
--

INSERT INTO `user_accounts` (`id`, `email`, `password`, `fullname`, `date_created`, `last_announcement_view`) VALUES
(1, 'user@gmail.com', 'user123', 'Jhon Doe', '2025-11-27 08:54:09', '2026-02-15 22:29:22'),
(2, 'abnudalo@gmail.com', 'rover', 'Aira Nudalo', '2025-11-27 09:00:27', '2026-03-27 16:25:17'),
(3, 'rose@gmail.com', 'rose', 'Roselle Pabulario', '2025-11-29 09:38:15', '2026-02-17 15:53:41'),
(4, 'ed@gmail.com', 'eduardo', 'Eduardo Balbarez', '2025-11-29 15:37:58', '2026-03-03 13:15:53'),
(5, 'peejay@gmail.com', 'peej', 'Peejay Morado', '2026-01-29 00:28:33', '2026-02-17 10:09:20'),
(6, 'ricky@gmail.com', 'ricky', 'Ricky Salada', '2026-02-16 03:52:02', '2026-03-03 23:10:56'),
(7, 'rachel@gmail.com', 'rachel', 'Rachel Baptisma', '2026-02-17 10:52:24', '2026-02-17 10:52:24'),
(8, 'jad@gmail.com', 'jad', 'Jad Cyril Egdamin', '2026-02-17 11:14:15', '2026-02-17 11:17:19'),
(9, 'ian@gmail.com', 'ian', 'Ian Sali', '2026-02-17 16:26:02', '2026-02-17 16:29:39'),
(10, 'dawe@gmail.com', 'dawe', 'DM Chan Dawe', '2026-02-18 12:51:07', '2026-02-18 12:51:29'),
(11, 'saavedra@gmail.com', 'saavy', 'Jhon Paul Saavedra', '2026-02-18 22:38:37', '2026-02-18 22:48:24'),
(12, 'ivan@gmail.com', 'ivan', 'Ivan Chel Nudalo', '2026-02-22 13:31:55', '2026-02-22 13:31:55');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `accounting_accounts`
--
ALTER TABLE `accounting_accounts`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `admin_accounts`
--
ALTER TABLE `admin_accounts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `announcements`
--
ALTER TABLE `announcements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `admin_id` (`admin_id`);

--
-- Indexes for table `registrar_accounts`
--
ALTER TABLE `registrar_accounts`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `suggestions`
--
ALTER TABLE `suggestions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `registrar_id` (`registrar_id`),
  ADD KEY `admin_id` (`admin_id`),
  ADD KEY `accounting_id` (`accounting_id`);

--
-- Indexes for table `testimonials`
--
ALTER TABLE `testimonials`
  ADD PRIMARY KEY (`id`),
  ADD KEY `suggestion_id` (`suggestion_id`);

--
-- Indexes for table `user_accounts`
--
ALTER TABLE `user_accounts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `accounting_accounts`
--
ALTER TABLE `accounting_accounts`
  MODIFY `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `admin_accounts`
--
ALTER TABLE `admin_accounts`
  MODIFY `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `announcements`
--
ALTER TABLE `announcements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;

--
-- AUTO_INCREMENT for table `registrar_accounts`
--
ALTER TABLE `registrar_accounts`
  MODIFY `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `suggestions`
--
ALTER TABLE `suggestions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT for table `testimonials`
--
ALTER TABLE `testimonials`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `user_accounts`
--
ALTER TABLE `user_accounts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `announcements`
--
ALTER TABLE `announcements`
  ADD CONSTRAINT `announcements_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `admin_accounts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `suggestions`
--
ALTER TABLE `suggestions`
  ADD CONSTRAINT `suggestions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user_accounts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `suggestions_ibfk_2` FOREIGN KEY (`registrar_id`) REFERENCES `registrar_accounts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `suggestions_ibfk_3` FOREIGN KEY (`admin_id`) REFERENCES `admin_accounts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `suggestions_ibfk_4` FOREIGN KEY (`accounting_id`) REFERENCES `accounting_accounts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `testimonials`
--
ALTER TABLE `testimonials`
  ADD CONSTRAINT `testimonials_ibfk_1` FOREIGN KEY (`suggestion_id`) REFERENCES `suggestions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
