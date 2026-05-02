-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 17, 2025 at 08:41 AM
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
-- Database: `ecotrack`
--

DELIMITER $$
--
-- Procedures
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `AutoAssignCrew` ()   BEGIN
    UPDATE PickupRequest p
    JOIN (
        SELECT CrewID
        FROM Crew
        WHERE CrewID IS NOT NULL
        ORDER BY RAND()
        LIMIT 1
    ) c
    SET p.CrewID = c.CrewID
    WHERE p.Status = 'Pending';
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `DeactivateOldUsers` ()   BEGIN
    UPDATE UserAccount
    SET IsActive = FALSE
    WHERE CreatedAt < DATE_SUB(NOW(), INTERVAL 1 YEAR);
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `GenerateMonthlyReport` ()   BEGIN
    INSERT INTO ReportSummary (
        ReportType,
        GeneratedBy,
        TotalPickups,
        CompletedPickups,
        MissedPickups,
        ContaminationRate,
        Remarks
    )
    SELECT
        'Monthly',
        1,
        COUNT(*),
        SUM(Status = 'Completed'),
        SUM(Status = 'Missed'),
        (
            SELECT AVG(PercentContamination)
            FROM ContaminationReport
        ),
        'Auto-generated monthly summary';
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `citizen`
--

CREATE TABLE `citizen` (
  `CitizenID` int(11) NOT NULL,
  `UserID` int(11) DEFAULT NULL,
  `FullName` varchar(100) NOT NULL,
  `Address` varchar(255) DEFAULT NULL,
  `ZoneID` int(11) DEFAULT NULL,
  `Type` enum('Individual','Business') DEFAULT 'Individual'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `citizen`
--

INSERT INTO `citizen` (`CitizenID`, `UserID`, `FullName`, `Address`, `ZoneID`, `Type`) VALUES
(1, 2, 'Alex Johnson', '12 King St', 1, 'Individual'),
(2, 3, 'Priya Patel', '78 Campus Rd Apt 4', 3, 'Individual');

-- --------------------------------------------------------

--
-- Table structure for table `complaint`
--

CREATE TABLE `complaint` (
  `ComplaintID` int(11) NOT NULL,
  `CitizenID` int(11) DEFAULT NULL,
  `RequestID` int(11) DEFAULT NULL,
  `Description` text NOT NULL,
  `DateSubmitted` datetime DEFAULT current_timestamp(),
  `Status` enum('Open','Resolved') DEFAULT 'Open',
  `ResolutionNotes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `complaint`
--

INSERT INTO `complaint` (`ComplaintID`, `CitizenID`, `RequestID`, `Description`, `DateSubmitted`, `Status`, `ResolutionNotes`) VALUES
(1, 1, 3, 'Pickup was missed even though bin was at curb.', '2025-11-12 13:36:05', 'Open', NULL),
(2, 2, 3, 'Driver blocked driveway briefly.', '2025-11-11 13:36:05', 'Resolved', 'Explained and apologized to resident.'),
(3, 1, 2, 'Bin was left in middle of sidewalk.', '2025-11-10 13:36:05', 'Resolved', 'Crew reminded about placement policy.');

--
-- Triggers `complaint`
--
DELIMITER $$
CREATE TRIGGER `trg_NotifyOnComplaint` AFTER INSERT ON `complaint` FOR EACH ROW BEGIN
    INSERT INTO Notification (UserID, Title, Message, DateSent)
    VALUES (
        (
            SELECT UserID
            FROM Citizen
            WHERE CitizenID = NEW.CitizenID
        ),
        'Complaint Submitted',
        CONCAT(
            'Your complaint ID ',
            NEW.ComplaintID,
            ' has been recorded.'
        ),
        NOW()
    );
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `contaminationreport`
--

CREATE TABLE `contaminationreport` (
  `ReportID` int(11) NOT NULL,
  `LoadID` int(11) DEFAULT NULL,
  `PercentContamination` decimal(5,2) DEFAULT NULL,
  `Type` varchar(50) DEFAULT NULL,
  `PhotoURL` varchar(255) DEFAULT NULL,
  `ReportedBy` int(11) DEFAULT NULL,
  `ReportDate` datetime DEFAULT current_timestamp(),
  `ReportedAt` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `contaminationreport`
--

INSERT INTO `contaminationreport` (`ReportID`, `LoadID`, `PercentContamination`, `Type`, `PhotoURL`, `ReportedBy`, `ReportDate`, `ReportedAt`) VALUES
(1, 1, 2.50, 'Plastic bags in paper stream', NULL, 1, '2025-11-11 13:36:05', '2025-11-11 13:36:05'),
(2, 2, 5.00, 'Food waste in recycling', NULL, 1, '2025-11-12 13:36:05', '2025-11-12 13:36:05'),
(3, 3, 1.00, 'Minor contamination', NULL, 1, '2025-11-13 13:36:05', '2025-11-13 13:36:05');

--
-- Triggers `contaminationreport`
--
DELIMITER $$
CREATE TRIGGER `trg_UpdateReportAfterInsert` AFTER INSERT ON `contaminationreport` FOR EACH ROW BEGIN
    UPDATE ReportSummary
    SET ContaminationRate = (
        SELECT AVG(PercentContamination)
        FROM ContaminationReport
    )
    WHERE ReportType = 'Monthly';
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `crew`
--

CREATE TABLE `crew` (
  `CrewID` int(11) NOT NULL,
  `UserID` int(11) DEFAULT NULL,
  `FullName` varchar(100) NOT NULL,
  `VehicleID` int(11) DEFAULT NULL,
  `RouteID` int(11) DEFAULT NULL,
  `ShiftTime` varchar(50) DEFAULT NULL,
  `Contact` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `crew`
--

INSERT INTO `crew` (`CrewID`, `UserID`, `FullName`, `VehicleID`, `RouteID`, `ShiftTime`, `Contact`) VALUES
(1, 4, 'Crew Lead One', 1, 1, '06:00-14:00', '519-333-3333'),
(2, 5, 'Crew Lead Two', 2, 2, '14:00-22:00', '519-444-4444');

-- --------------------------------------------------------

--
-- Table structure for table `issuereport`
--

CREATE TABLE `issuereport` (
  `IssueID` int(11) NOT NULL,
  `CrewID` int(11) DEFAULT NULL,
  `RequestID` int(11) DEFAULT NULL,
  `IssueType` varchar(100) DEFAULT NULL,
  `Description` text DEFAULT NULL,
  `PhotoURL` varchar(255) DEFAULT NULL,
  `ReportDate` datetime DEFAULT current_timestamp(),
  `Status` enum('Pending','Resolved') DEFAULT 'Pending'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `issuereport`
--

INSERT INTO `issuereport` (`IssueID`, `CrewID`, `RequestID`, `IssueType`, `Description`, `PhotoURL`, `ReportDate`, `Status`) VALUES
(1, 1, 1, 'Blocked access', 'Street blocked by parked cars.', NULL, '2025-11-12 13:36:05', 'Pending'),
(2, 1, 2, 'Bin damage', 'Cracked recycling bin observed.', NULL, '2025-11-11 13:36:05', 'Resolved'),
(3, 2, 3, 'Contamination', 'Non-recyclable waste in blue bin.', NULL, '2025-11-12 13:36:05', 'Pending');

-- --------------------------------------------------------

--
-- Table structure for table `loaddata`
--

CREATE TABLE `loaddata` (
  `LoadID` int(11) NOT NULL,
  `CrewID` int(11) DEFAULT NULL,
  `CenterID` int(11) DEFAULT NULL,
  `GrossWeight` decimal(10,2) DEFAULT NULL,
  `TareWeight` decimal(10,2) DEFAULT NULL,
  `NetWeight` decimal(10,2) DEFAULT NULL,
  `DateReceived` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `loaddata`
--

INSERT INTO `loaddata` (`LoadID`, `CrewID`, `CenterID`, `GrossWeight`, `TareWeight`, `NetWeight`, `DateReceived`) VALUES
(1, 1, 1, 5000.00, 2000.00, 3000.00, '2025-11-11'),
(2, 1, 1, 4800.00, 2000.00, 2800.00, '2025-11-12'),
(3, 2, 2, 5200.00, 2100.00, 3100.00, '2025-11-13');

--
-- Triggers `loaddata`
--
DELIMITER $$
CREATE TRIGGER `trg_CalcNetWeight` BEFORE INSERT ON `loaddata` FOR EACH ROW BEGIN
    SET NEW.NetWeight = NEW.GrossWeight - NEW.TareWeight;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `loadmaterial`
--

CREATE TABLE `loadmaterial` (
  `LoadID` int(11) NOT NULL,
  `CategoryID` int(11) NOT NULL,
  `WeightCollected` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `loadmaterial`
--

INSERT INTO `loadmaterial` (`LoadID`, `CategoryID`, `WeightCollected`) VALUES
(1, 1, 1200.00),
(1, 2, 900.00),
(2, 1, 1000.00),
(2, 3, 800.00),
(3, 4, 1100.00);

-- --------------------------------------------------------

--
-- Table structure for table `materialcategory`
--

CREATE TABLE `materialcategory` (
  `CategoryID` int(11) NOT NULL,
  `CategoryName` varchar(50) NOT NULL,
  `Description` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `materialcategory`
--

INSERT INTO `materialcategory` (`CategoryID`, `CategoryName`, `Description`) VALUES
(1, 'Paper', 'Mixed paper and cardboard'),
(2, 'Plastic', 'Household plastics'),
(3, 'Metal', 'Aluminum and steel cans'),
(4, 'Glass', 'Bottles and jars'),
(5, 'Organic', 'Food and yard waste');

-- --------------------------------------------------------

--
-- Table structure for table `notification`
--

CREATE TABLE `notification` (
  `NotificationID` int(11) NOT NULL,
  `UserID` int(11) DEFAULT NULL,
  `Title` varchar(100) DEFAULT NULL,
  `Message` text DEFAULT NULL,
  `DateSent` datetime DEFAULT current_timestamp(),
  `IsRead` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notification`
--

INSERT INTO `notification` (`NotificationID`, `UserID`, `Title`, `Message`, `DateSent`, `IsRead`) VALUES
(1, 2, 'Pickup scheduled', 'Your regular pickup is scheduled for tomorrow.', '2025-11-12 13:36:05', 1),
(2, 2, 'Pickup completed', 'Your bulk pickup was completed successfully.', '2025-11-11 13:36:05', 1),
(3, 3, 'Missed pickup', 'We noticed a missed pickup and are investigating.', '2025-11-12 13:36:05', 0),
(4, 4, 'Route assignment', 'You have been assigned to Route 1 today.', '2025-11-12 13:36:05', 0),
(5, 6, 'Load reminder', 'Remember to record today\'s load data.', '2025-11-13 13:36:05', 1);

-- --------------------------------------------------------

--
-- Table structure for table `pickuprequest`
--

CREATE TABLE `pickuprequest` (
  `RequestID` int(11) NOT NULL,
  `CitizenID` int(11) DEFAULT NULL,
  `ZoneID` int(11) DEFAULT NULL,
  `RouteID` int(11) DEFAULT NULL,
  `PickupType` enum('Regular','Bulk','Special') DEFAULT 'Regular',
  `WasteType` varchar(50) NOT NULL DEFAULT 'Recyclables',
  `RequestedDate` datetime DEFAULT NULL,
  `ScheduledDate` datetime NOT NULL,
  `Status` enum('Pending','Completed','Missed') DEFAULT 'Pending',
  `CrewID` int(11) DEFAULT NULL,
  `Notes` text DEFAULT NULL,
  `CreatedAt` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pickuprequest`
--

INSERT INTO `pickuprequest` (`RequestID`, `CitizenID`, `ZoneID`, `RouteID`, `PickupType`, `WasteType`, `RequestedDate`, `ScheduledDate`, `Status`, `CrewID`, `Notes`, `CreatedAt`) VALUES
(1, 1, 1, 1, 'Regular', 'Recyclables', '2025-11-11 13:36:05', '2025-11-14 13:36:05', 'Pending', 1, 'Weekly curbside pickup.', '2025-11-12 13:36:05'),
(2, 1, 1, 1, 'Bulk', 'Bulk Waste', '2025-11-08 13:36:05', '2025-11-11 13:36:05', 'Completed', 1, 'Old furniture collected.', '2025-11-07 13:36:05'),
(3, 2, 3, 3, 'Regular', 'Recyclables', '2025-11-10 13:36:05', '2025-11-12 13:36:05', 'Missed', 2, 'Bin not out in time.', '2025-11-10 13:36:05'),
(4, 2, 3, 3, 'Special', 'Electronics', '2025-11-13 13:36:05', '2025-11-16 13:36:05', 'Pending', 2, 'Electronics recycling request.', '2025-11-13 13:36:05'),
(5, 1, 1, 1, 'Regular', 'Organics', '2025-11-12 13:36:05', '2025-11-18 13:36:05', 'Pending', NULL, 'New service request.', '2025-11-13 13:36:05'),
(6, 1, NULL, NULL, '', 'Recyclables', NULL, '2025-11-19 15:22:00', 'Pending', NULL, 'Please pick up', '2025-11-17 01:22:45');

-- --------------------------------------------------------

--
-- Table structure for table `pickupstatus`
--

CREATE TABLE `pickupstatus` (
  `StatusID` int(11) NOT NULL,
  `RequestID` int(11) DEFAULT NULL,
  `Status` enum('Completed','Missed','Blocked','Contaminated') DEFAULT NULL,
  `UpdateTime` datetime DEFAULT current_timestamp(),
  `Remarks` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pickupstatus`
--

INSERT INTO `pickupstatus` (`StatusID`, `RequestID`, `Status`, `UpdateTime`, `Remarks`) VALUES
(1, 1, '', '2025-11-12 13:36:05', 'Request received, awaiting route confirmation.'),
(2, 2, 'Completed', '2025-11-12 13:36:05', 'Pickup completed successfully.'),
(3, 3, 'Missed', '2025-11-13 01:36:05', 'Customer did not place bin at curb.'),
(4, 4, '', '2025-11-13 13:36:05', 'Request scheduled for special pickup.'),
(5, 5, '', '2025-11-13 13:36:05', 'New request logged into system.');

-- --------------------------------------------------------

--
-- Table structure for table `recyclingcenter`
--

CREATE TABLE `recyclingcenter` (
  `CenterID` int(11) NOT NULL,
  `CenterName` varchar(100) NOT NULL,
  `Address` varchar(255) DEFAULT NULL,
  `Contact` varchar(50) DEFAULT NULL,
  `ManagerName` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `recyclingcenter`
--

INSERT INTO `recyclingcenter` (`CenterID`, `CenterName`, `Address`, `Contact`, `ManagerName`) VALUES
(1, 'Central Recycling Hub', '123 Main St', '519-111-1111', 'Jordan Lee'),
(2, 'Riverside Transfer Station', '45 River Rd', '519-222-2222', 'Maria Silva'),
(3, 'West-End Recovery Center', '89 West Ave', '519-333-3333', 'Omar Khan');

-- --------------------------------------------------------

--
-- Table structure for table `recyclingstaff`
--

CREATE TABLE `recyclingstaff` (
  `StaffID` int(11) NOT NULL,
  `UserID` int(11) DEFAULT NULL,
  `CenterID` int(11) DEFAULT NULL,
  `FullName` varchar(100) NOT NULL,
  `Position` varchar(50) DEFAULT NULL,
  `Contact` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `recyclingstaff`
--

INSERT INTO `recyclingstaff` (`StaffID`, `UserID`, `CenterID`, `FullName`, `Position`, `Contact`) VALUES
(1, 6, 1, 'Center Staff One', 'Weighbridge Operator', '519-555-5555');

-- --------------------------------------------------------

--
-- Table structure for table `reportsummary`
--

CREATE TABLE `reportsummary` (
  `ReportID` int(11) NOT NULL,
  `ReportType` enum('Daily','Weekly','Monthly') DEFAULT NULL,
  `GeneratedBy` int(11) DEFAULT NULL,
  `GeneratedDate` datetime DEFAULT current_timestamp(),
  `TotalPickups` int(11) DEFAULT NULL,
  `CompletedPickups` int(11) DEFAULT NULL,
  `MissedPickups` int(11) DEFAULT NULL,
  `ContaminationRate` decimal(5,2) DEFAULT NULL,
  `Remarks` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `reportsummary`
--

INSERT INTO `reportsummary` (`ReportID`, `ReportType`, `GeneratedBy`, `GeneratedDate`, `TotalPickups`, `CompletedPickups`, `MissedPickups`, `ContaminationRate`, `Remarks`) VALUES
(1, 'Daily', 1, '2025-11-11 13:36:05', 25, 22, 3, 3.50, 'Slight increase in missed pickups due to weather.'),
(2, 'Weekly', 1, '2025-11-06 13:36:05', 140, 130, 10, 2.80, 'Overall performance is stable.'),
(3, 'Monthly', 1, '2025-10-14 13:36:05', 600, 570, 30, 3.10, 'Monitoring contamination in certain zones.');

-- --------------------------------------------------------

--
-- Table structure for table `role`
--

CREATE TABLE `role` (
  `RoleID` int(11) NOT NULL,
  `RoleName` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `role`
--

INSERT INTO `role` (`RoleID`, `RoleName`) VALUES
(4, 'Admin'),
(1, 'Citizen'),
(2, 'Crew'),
(3, 'Staff');

-- --------------------------------------------------------

--
-- Table structure for table `route`
--

CREATE TABLE `route` (
  `RouteID` int(11) NOT NULL,
  `ZoneID` int(11) DEFAULT NULL,
  `StartPoint` varchar(255) DEFAULT NULL,
  `EndPoint` varchar(255) DEFAULT NULL,
  `EstimatedTime` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `route`
--

INSERT INTO `route` (`RouteID`, `ZoneID`, `StartPoint`, `EndPoint`, `EstimatedTime`) VALUES
(1, 1, 'Downtown East', 'Downtown West', '2 hours'),
(2, 2, 'Riverside North', 'Riverside South', '2.5 hours'),
(3, 3, 'Campus North', 'Campus South', '1.5 hours'),
(4, 4, 'Industrial Park', 'Logistics Hub', '3 hours'),
(5, 5, 'Suburban Loop', 'Community Center', '2 hours');

-- --------------------------------------------------------

--
-- Table structure for table `useraccount`
--

CREATE TABLE `useraccount` (
  `UserID` int(11) NOT NULL,
  `Username` varchar(50) NOT NULL,
  `PasswordHash` varchar(255) NOT NULL,
  `Email` varchar(100) DEFAULT NULL,
  `Phone` varchar(20) DEFAULT NULL,
  `RoleID` int(11) DEFAULT NULL,
  `CreatedAt` datetime DEFAULT current_timestamp(),
  `IsActive` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `useraccount`
--

INSERT INTO `useraccount` (`UserID`, `Username`, `PasswordHash`, `Email`, `Phone`, `RoleID`, `CreatedAt`, `IsActive`) VALUES
(1, 'admin', '$2y$10$JYkDHt1gyrz5bxSqYljCGOx4nFTgfSoWA7Mugcc2W43q3KvHjpRNS', 'admin@ecotrack.local', '519-000-0000', 4, '2025-11-13 13:36:05', 1),
(2, 'citizen1', '$2y$10$Llrf22NvcsMkDQL.fn039uU21mwU/n466jP.YoQCC3dpQD.d5yldi', 'alex@example.com', '519-111-1111', 1, '2025-11-13 13:36:05', 1),
(3, 'citizen2', '$2y$10$Llrf22NvcsMkDQL.fn039uU21mwU/n466jP.YoQCC3dpQD.d5yldi', 'priya@example.com', '519-222-2222', 1, '2025-11-13 13:36:05', 1),
(4, 'crew1', '$2y$10$4XZ.d1LRWEM.yCRDIR/O5eH.34OLRnmpRQLCMkfChyZWakc7CBWES', 'crew1@example.com', '519-333-3333', 2, '2025-11-13 13:36:05', 1),
(5, 'crew2', '$2y$10$4XZ.d1LRWEM.yCRDIR/O5eH.34OLRnmpRQLCMkfChyZWakc7CBWES', 'crew2@example.com', '519-444-4444', 2, '2025-11-13 13:36:05', 1),
(6, 'staff1', '$2y$10$UT6RqigFEkHRQztOymh/2u258LnGBuXCLn6CORKBs/242ZM/aKag2', 'staff1@center.local', '519-555-5555', 3, '2025-11-13 13:36:05', 1);

-- --------------------------------------------------------

--
-- Table structure for table `vehicle`
--

CREATE TABLE `vehicle` (
  `VehicleID` int(11) NOT NULL,
  `PlateNumber` varchar(20) NOT NULL,
  `Model` varchar(50) DEFAULT NULL,
  `Capacity` decimal(10,2) DEFAULT NULL,
  `Status` enum('Active','UnderMaintenance') DEFAULT 'Active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `vehicle`
--

INSERT INTO `vehicle` (`VehicleID`, `PlateNumber`, `Model`, `Capacity`, `Status`) VALUES
(1, 'EC-1001', 'Garbage Truck A', 8000.00, 'Active'),
(2, 'EC-1002', 'Recycling Truck B', 7500.00, 'Active'),
(3, 'EC-1003', 'Organic Truck C', 7000.00, 'UnderMaintenance');

-- --------------------------------------------------------

--
-- Table structure for table `zone`
--

CREATE TABLE `zone` (
  `ZoneID` int(11) NOT NULL,
  `ZoneName` varchar(100) NOT NULL,
  `City` varchar(100) DEFAULT NULL,
  `PostalCode` varchar(10) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `zone`
--

INSERT INTO `zone` (`ZoneID`, `ZoneName`, `City`, `PostalCode`) VALUES
(1, 'Downtown', 'Windsor', 'N9A1A1'),
(2, 'Riverside', 'Windsor', 'N8Y2B2'),
(3, 'University', 'Windsor', 'N9B3C3'),
(4, 'Industrial', 'Windsor', 'N9C4D4'),
(5, 'Suburban', 'Windsor', 'N9E5E5');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `citizen`
--
ALTER TABLE `citizen`
  ADD PRIMARY KEY (`CitizenID`),
  ADD KEY `fk_citizen_user` (`UserID`),
  ADD KEY `fk_citizen_zone` (`ZoneID`);

--
-- Indexes for table `complaint`
--
ALTER TABLE `complaint`
  ADD PRIMARY KEY (`ComplaintID`),
  ADD KEY `fk_complaint_citizen` (`CitizenID`),
  ADD KEY `fk_complaint_request` (`RequestID`);

--
-- Indexes for table `contaminationreport`
--
ALTER TABLE `contaminationreport`
  ADD PRIMARY KEY (`ReportID`),
  ADD KEY `fk_contam_load` (`LoadID`),
  ADD KEY `fk_contam_staff` (`ReportedBy`);

--
-- Indexes for table `crew`
--
ALTER TABLE `crew`
  ADD PRIMARY KEY (`CrewID`),
  ADD KEY `fk_crew_user` (`UserID`),
  ADD KEY `fk_crew_vehicle` (`VehicleID`),
  ADD KEY `fk_crew_route` (`RouteID`);

--
-- Indexes for table `issuereport`
--
ALTER TABLE `issuereport`
  ADD PRIMARY KEY (`IssueID`),
  ADD KEY `fk_issue_crew` (`CrewID`),
  ADD KEY `fk_issue_request` (`RequestID`);

--
-- Indexes for table `loaddata`
--
ALTER TABLE `loaddata`
  ADD PRIMARY KEY (`LoadID`),
  ADD KEY `fk_load_crew` (`CrewID`),
  ADD KEY `fk_load_center` (`CenterID`);

--
-- Indexes for table `loadmaterial`
--
ALTER TABLE `loadmaterial`
  ADD PRIMARY KEY (`LoadID`,`CategoryID`),
  ADD KEY `fk_loadmat_cat` (`CategoryID`);

--
-- Indexes for table `materialcategory`
--
ALTER TABLE `materialcategory`
  ADD PRIMARY KEY (`CategoryID`),
  ADD UNIQUE KEY `CategoryName` (`CategoryName`);

--
-- Indexes for table `notification`
--
ALTER TABLE `notification`
  ADD PRIMARY KEY (`NotificationID`),
  ADD KEY `fk_notify_user` (`UserID`);

--
-- Indexes for table `pickuprequest`
--
ALTER TABLE `pickuprequest`
  ADD PRIMARY KEY (`RequestID`),
  ADD KEY `fk_pickup_citizen` (`CitizenID`),
  ADD KEY `fk_pickup_zone` (`ZoneID`),
  ADD KEY `fk_pickup_route` (`RouteID`),
  ADD KEY `fk_pickup_crew` (`CrewID`);

--
-- Indexes for table `pickupstatus`
--
ALTER TABLE `pickupstatus`
  ADD PRIMARY KEY (`StatusID`),
  ADD KEY `fk_status_request` (`RequestID`);

--
-- Indexes for table `recyclingcenter`
--
ALTER TABLE `recyclingcenter`
  ADD PRIMARY KEY (`CenterID`);

--
-- Indexes for table `recyclingstaff`
--
ALTER TABLE `recyclingstaff`
  ADD PRIMARY KEY (`StaffID`),
  ADD KEY `fk_staff_user` (`UserID`),
  ADD KEY `fk_staff_center` (`CenterID`);

--
-- Indexes for table `reportsummary`
--
ALTER TABLE `reportsummary`
  ADD PRIMARY KEY (`ReportID`),
  ADD KEY `fk_report_generatedby` (`GeneratedBy`);

--
-- Indexes for table `role`
--
ALTER TABLE `role`
  ADD PRIMARY KEY (`RoleID`),
  ADD UNIQUE KEY `RoleName` (`RoleName`);

--
-- Indexes for table `route`
--
ALTER TABLE `route`
  ADD PRIMARY KEY (`RouteID`),
  ADD KEY `fk_route_zone` (`ZoneID`);

--
-- Indexes for table `useraccount`
--
ALTER TABLE `useraccount`
  ADD PRIMARY KEY (`UserID`),
  ADD UNIQUE KEY `Username` (`Username`),
  ADD KEY `fk_user_role` (`RoleID`);

--
-- Indexes for table `vehicle`
--
ALTER TABLE `vehicle`
  ADD PRIMARY KEY (`VehicleID`),
  ADD UNIQUE KEY `PlateNumber` (`PlateNumber`);

--
-- Indexes for table `zone`
--
ALTER TABLE `zone`
  ADD PRIMARY KEY (`ZoneID`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `citizen`
--
ALTER TABLE `citizen`
  MODIFY `CitizenID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `complaint`
--
ALTER TABLE `complaint`
  MODIFY `ComplaintID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `contaminationreport`
--
ALTER TABLE `contaminationreport`
  MODIFY `ReportID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `crew`
--
ALTER TABLE `crew`
  MODIFY `CrewID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `issuereport`
--
ALTER TABLE `issuereport`
  MODIFY `IssueID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `loaddata`
--
ALTER TABLE `loaddata`
  MODIFY `LoadID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `materialcategory`
--
ALTER TABLE `materialcategory`
  MODIFY `CategoryID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `notification`
--
ALTER TABLE `notification`
  MODIFY `NotificationID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `pickuprequest`
--
ALTER TABLE `pickuprequest`
  MODIFY `RequestID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `pickupstatus`
--
ALTER TABLE `pickupstatus`
  MODIFY `StatusID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `recyclingcenter`
--
ALTER TABLE `recyclingcenter`
  MODIFY `CenterID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `recyclingstaff`
--
ALTER TABLE `recyclingstaff`
  MODIFY `StaffID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `reportsummary`
--
ALTER TABLE `reportsummary`
  MODIFY `ReportID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `role`
--
ALTER TABLE `role`
  MODIFY `RoleID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `route`
--
ALTER TABLE `route`
  MODIFY `RouteID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `useraccount`
--
ALTER TABLE `useraccount`
  MODIFY `UserID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `vehicle`
--
ALTER TABLE `vehicle`
  MODIFY `VehicleID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `zone`
--
ALTER TABLE `zone`
  MODIFY `ZoneID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `citizen`
--
ALTER TABLE `citizen`
  ADD CONSTRAINT `fk_citizen_user` FOREIGN KEY (`UserID`) REFERENCES `useraccount` (`UserID`),
  ADD CONSTRAINT `fk_citizen_zone` FOREIGN KEY (`ZoneID`) REFERENCES `zone` (`ZoneID`);

--
-- Constraints for table `complaint`
--
ALTER TABLE `complaint`
  ADD CONSTRAINT `fk_complaint_citizen` FOREIGN KEY (`CitizenID`) REFERENCES `citizen` (`CitizenID`),
  ADD CONSTRAINT `fk_complaint_request` FOREIGN KEY (`RequestID`) REFERENCES `pickuprequest` (`RequestID`);

--
-- Constraints for table `contaminationreport`
--
ALTER TABLE `contaminationreport`
  ADD CONSTRAINT `fk_contam_load` FOREIGN KEY (`LoadID`) REFERENCES `loaddata` (`LoadID`),
  ADD CONSTRAINT `fk_contam_staff` FOREIGN KEY (`ReportedBy`) REFERENCES `recyclingstaff` (`StaffID`);

--
-- Constraints for table `crew`
--
ALTER TABLE `crew`
  ADD CONSTRAINT `fk_crew_route` FOREIGN KEY (`RouteID`) REFERENCES `route` (`RouteID`),
  ADD CONSTRAINT `fk_crew_user` FOREIGN KEY (`UserID`) REFERENCES `useraccount` (`UserID`),
  ADD CONSTRAINT `fk_crew_vehicle` FOREIGN KEY (`VehicleID`) REFERENCES `vehicle` (`VehicleID`);

--
-- Constraints for table `issuereport`
--
ALTER TABLE `issuereport`
  ADD CONSTRAINT `fk_issue_crew` FOREIGN KEY (`CrewID`) REFERENCES `crew` (`CrewID`),
  ADD CONSTRAINT `fk_issue_request` FOREIGN KEY (`RequestID`) REFERENCES `pickuprequest` (`RequestID`);

--
-- Constraints for table `loaddata`
--
ALTER TABLE `loaddata`
  ADD CONSTRAINT `fk_load_center` FOREIGN KEY (`CenterID`) REFERENCES `recyclingcenter` (`CenterID`),
  ADD CONSTRAINT `fk_load_crew` FOREIGN KEY (`CrewID`) REFERENCES `crew` (`CrewID`);

--
-- Constraints for table `loadmaterial`
--
ALTER TABLE `loadmaterial`
  ADD CONSTRAINT `fk_loadmat_cat` FOREIGN KEY (`CategoryID`) REFERENCES `materialcategory` (`CategoryID`),
  ADD CONSTRAINT `fk_loadmat_load` FOREIGN KEY (`LoadID`) REFERENCES `loaddata` (`LoadID`);

--
-- Constraints for table `notification`
--
ALTER TABLE `notification`
  ADD CONSTRAINT `fk_notify_user` FOREIGN KEY (`UserID`) REFERENCES `useraccount` (`UserID`);

--
-- Constraints for table `pickuprequest`
--
ALTER TABLE `pickuprequest`
  ADD CONSTRAINT `fk_pickup_citizen` FOREIGN KEY (`CitizenID`) REFERENCES `citizen` (`CitizenID`),
  ADD CONSTRAINT `fk_pickup_crew` FOREIGN KEY (`CrewID`) REFERENCES `crew` (`CrewID`),
  ADD CONSTRAINT `fk_pickup_route` FOREIGN KEY (`RouteID`) REFERENCES `route` (`RouteID`),
  ADD CONSTRAINT `fk_pickup_zone` FOREIGN KEY (`ZoneID`) REFERENCES `zone` (`ZoneID`);

--
-- Constraints for table `pickupstatus`
--
ALTER TABLE `pickupstatus`
  ADD CONSTRAINT `fk_status_request` FOREIGN KEY (`RequestID`) REFERENCES `pickuprequest` (`RequestID`);

--
-- Constraints for table `recyclingstaff`
--
ALTER TABLE `recyclingstaff`
  ADD CONSTRAINT `fk_staff_center` FOREIGN KEY (`CenterID`) REFERENCES `recyclingcenter` (`CenterID`),
  ADD CONSTRAINT `fk_staff_user` FOREIGN KEY (`UserID`) REFERENCES `useraccount` (`UserID`);

--
-- Constraints for table `reportsummary`
--
ALTER TABLE `reportsummary`
  ADD CONSTRAINT `fk_report_generatedby` FOREIGN KEY (`GeneratedBy`) REFERENCES `useraccount` (`UserID`);

--
-- Constraints for table `route`
--
ALTER TABLE `route`
  ADD CONSTRAINT `fk_route_zone` FOREIGN KEY (`ZoneID`) REFERENCES `zone` (`ZoneID`);

--
-- Constraints for table `useraccount`
--
ALTER TABLE `useraccount`
  ADD CONSTRAINT `fk_user_role` FOREIGN KEY (`RoleID`) REFERENCES `role` (`RoleID`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
