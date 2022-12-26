Create Schema if not exists transport;
use transport;

CREATE TABLE requests(
UserRole varchar(30),
UserID varchar(20),
UserName varchar(20),
RequestDate date,
Information varchar(150),
AdminAction boolean
);

CREATE TABLE login(
Email varchar(30),
AccPassword varchar(100),
UserRole varchar(20),
UserStatus boolean,
CONSTRAINT pk_login_email PRIMARY KEY (Email),
CONSTRAINT passwordlength CHECK (length(AccPassword)>=8)
);

CREATE TABLE student(
FirstName varchar(25),
LastName varchar(25),
Phone char(11),
CmsID char(6),
Email varchar(30) NOT NULL,
Address varchar(50),
Department varchar(5),
Enddate date,
DestName varchar(50),
DriverID int,
CONSTRAINT pk_student_cmsid PRIMARY KEY (CmsID),
CONSTRAINT alphabetFLnamestudent CHECK (FirstName NOT LIKE '%[0-9]%' and LastName NOT LIKE '%[0-9]%')
);


CREATE TABLE driver(
DriverID int AUTO_INCREMENT,
FirstName varchar(25),
LastName varchar(25),
Phone char(11),
Email varchar(30) NOT NULL,
CNIC char(13),
vehicleno varchar(8),
RouteID char(5),
Address varchar(50),
HireDate date,
EndDate date,
CONSTRAINT pk_driver_driverid PRIMARY KEY (DriverID),
CONSTRAINT alphabetFLnamedriver CHECK (FirstName NOT LIKE '%[0-9]%' and LastName NOT LIKE '%[0-9]%')
);



CREATE TABLE DSalary(
ChallanNumber BINARY(16),
DriverID int,
DueDate date,
SalaryAmount int, 
PaidStatus varchar(6),
CONSTRAINT pk_dsalary_challan PRIMARY KEY (ChallanNumber),
CONSTRAINT Dsalpaid CHECK (PaidStatus IN ('Paid','Unpaid'))
);


CREATE TABLE vehicle(
VehicleNo varchar(8),
NumOfSeats int,
Color varchar(10),
Model varchar(10),
Enddate date,
CONSTRAINT pk_vehicle_vehicleNo PRIMARY KEY (Vehicleno),
CONSTRAINT seatnumcheck CHECK (NumOfSeats>0)
);





CREATE TABLE employee(
EmpID int AUTO_INCREMENT,
FirstName varchar(25),
LastName varchar(25),
Phone char(11),
CNIC char(13),
Email varchar(30),
HireDate date,
endDate date,
Address varchar(50),
JobName varchar(15),
CONSTRAINT pk_employee_EmpID PRIMARY KEY (EmpID),
CONSTRAINT alphabetFLnameemployee CHECK (FirstName NOT LIKE '%[0-9]%' and LastName NOT LIKE '%[0-9]%')
);

CREATE TABLE ESalary(
ChallanNum BINARY(16),
EmpID int,
DueDate date,
SalaryAmount int, 
PaidStatus varchar(6),
CONSTRAINT pk_esalary_challan PRIMARY KEY (ChallanNum),
CONSTRAINT Esalpaid CHECK (PaidStatus IN ('Paid','Unpaid'))
);



CREATE TABLE payment(
ChallanNum int,
PaymentDate date,
Amount int, 
PaidStatus varchar(6),
CmsID char(6),
CONSTRAINT pk_payment_challannum PRIMARY KEY (ChallanNum),
CONSTRAINT paidname CHECK (PaidStatus IN ('Paid','Unpaid'))
);

CREATE TABLE empdetails(
JobName varchar(15),
NumOfHoursDaily int,
SalAmnt int,
CONSTRAINT pk_empdetails_jobname PRIMARY KEY (JobName),
CONSTRAINT numofhourscheck CHECK (NumOfHoursDaily>0 and NumOfHoursDaily<=9)
);


CREATE TABLE route(
RouteID char(5),
VehicleNo varchar(8),
FreeSlots int,
ShiftTime varchar(10),
Status varchar(6),
CONSTRAINT pk_route_routeid PRIMARY KEY (RouteID),
CONSTRAINT Shiftrange CHECK (ShiftTime IN ('9-5','1-5','1-9')),
CONSTRAINT statuscheck CHECK (Status IN ('Active','Inactive'))
);

create TABLE route_destinations(

RouteID char(5),
DestName varchar(50) not null,
Constraint pk_destinations primary key (RouteID,DestName)
);

CREATE TABLE destinations(
DestName varchar(20),
EquivDFare int,
CONSTRAINT pk_distancefare_destname PRIMARY KEY (DestName),
CONSTRAINT farecheck CHECK (EquivDFare>=0)
);



ALTER TABLE route_destinations
ADD CONSTRAINT fk_destinations_routeid FOREIGN KEY (RouteID) REFERENCES Route(RouteID),
ADD CONSTRAINT fk_destinations_destname FOREIGN KEY (destname) REFERENCES destinations(DestName);

alter table route
add constraint fk_route_vehicleno foreign key(vehicleno) references vehicle(vehicleno);

ALTER TABLE driver
ADD CONSTRAINT fk_driver_email FOREIGN KEY (Email) REFERENCES login(Email),
ADD CONSTRAINT fk_driver_vehicleno FOREIGN KEY (vehicleno) REFERENCES vehicle(vehicleno),
ADD CONSTRAINT fk_driver_route FOREIGN KEY (RouteID) REFERENCES route(RouteID);
ALTER TABLE employee 
ADD CONSTRAINT fk_employee_email FOREIGN KEY (Email) REFERENCES login(Email),
ADD CONSTRAINT fk_employee_empdetails FOREIGN KEY (JobName) REFERENCES empdetails(JobName);
ALTER TABLE payment ADD CONSTRAINT fk_payment_student FOREIGN KEY (CmsID) REFERENCES student(CmsID);
ALTER TABLE ESalary ADD CONSTRAINT fk_EmpID FOREIGN KEY (EmpID) REFERENCES Employee(EmpID);
ALTER TABLE DSalary ADD CONSTRAINT fk_DriverID FOREIGN KEY (DriverID) REFERENCES Driver(DriverID);

ALTER TABLE student
ADD CONSTRAINT fk_student_email FOREIGN KEY (Email) REFERENCES login(Email),
ADD CONSTRAINT fk_student_driver FOREIGN KEY (DriverID) REFERENCES driver(DriverID),
ADD CONSTRAINT fk_student_destName FOREIGN KEY (DestName) REFERENCES destinations(DestName);







insert into destinations values
('Saddar',1000),
('Satellite Town',2000),
('Faizabad',3000),
('Bahria Town',4000),
('F6',4000),
('F7',4000),
('I8',4000);

INSERT INTO vehicle VALUES
('LES8400',12,'White', 'HIACE', NULL),
('IST1809',12,'White', 'HIACE',NULL),
('MLT1208',21,'Blue', 'COASTER',NULL),
('LHR2164',14,'White', 'HIACE',NULL);

INSERT INTO empdetails VALUES
('Accountant',6,50000),
('Human Resources',5,40000),
('Supervisor',9,100000);

INSERT INTO login VALUES
('umairasim@gmail.com','xoxoxoxo','Administrator',true),
('student1@gmail.com','emaanumer','Student',true),
('student2@gmail.com','emaanumer','Student',true),
('driver1@gmail.com','janijani','Driver',true),
('driver2@gmail.com','janijani','Driver',true),
('employee1@gmail.com','zubaidaaa','Employee',true),
('employee2@gmail.com','zubaidaaa','Employee',true);


insert into route values
('BTN95','IST1809',11,'9-5','active'),
('STN95','LES8400',11,'9-5','active');

INSERT INTO driver(FirstName,LastName,Phone,Email,CNIC,vehicleno,RouteID,Address,HireDate,
EndDate) VALUES
('Ahmed','Ayaz','03219429103','driver1@gmail.com','6110106288014','LES8400','STN95', 'Bhara Koh , st 2 , house 5', '2020-12-12',null),
('Faris','Khan','03055813383','driver2@gmail.com','6110106288015','IST1809','BTN95', 'F6, st 7 , house 11','2021-11-11', null);

insert into route_destinations values
('BTN95','Saddar'),
('BTN95','Satellite Town'),
('BTN95','Bahria Town'),
('STN95','Satellite Town'),
('STN95','Faizabad'),
('STN95','F6');


INSERT INTO student VALUES
('Hasnain','Ahmed','03324322441','398231','student1@gmail.com','St 122, House 242, Phase 3, Bahria Town','SMME',null,'Bahria Town',1),
('Rubaiha','Shaheen','03458588432','365451','student2@gmail.com','Main Road, Block D, F6','S3H',null,'F6',2);

INSERT INTO employee VALUES
(1,'Zubaida','Farhan','0335100063','6110123488014','EMPLOYEE1@gmail.com','2020-09-11',null,'Bahria Town phase 5, House 170, St 3', 'Accountant'),
(2,'Asad','Zafar','0315102065','6110106222012','EMPLOYEE2@gmail.com','2018-10-18',null,'Media Town block A, House 4, St 55', 'Supervisor');


INSERT INTO payment VALUES
(2838221,'2022-12-05',4000, 'Paid','365451'),
(2838222,'2022-12-05',4000, 'Unpaid','398231');

insert into esalary values
(UUID_TO_BIN(UUID()),1,'2023-11-11',50000,'Unpaid'),
(UUID_TO_BIN(UUID()),2,'2023-11-11',100000,'Unpaid');
insert into dsalary values
(UUID_TO_BIN(UUID()),1,'2023-11-11',30000,'Unpaid'),
(UUID_TO_BIN(UUID()),2,'2023-11-11',30000,'Unpaid');

INSERT INTO requests values
('Driver',2,'Faris Khan',"2022-11-11","Need leave from 1st january to 3rd january",false);