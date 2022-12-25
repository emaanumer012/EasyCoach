//requiring basic things

const express = require("express");
const path = require("path");
const ejsmate = require("ejs-mate");
var mysql = require("mysql2/promise");
const catchAsync = require("./utils/catchAsync");
const ExpressError = require("./utils/ExpressError");
const bcrypt = require("bcrypt");




const methodover = require("method-override");
const flash = require("connect-flash");
const session = require("express-session");
const { isAdmin, isLoggedIn } = require("./middleware");


//Connection Info
let con;
const connect = async function () {
  con = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "@bubakar1243",
    database: "transport",
    insecureAuth: true,
  });
};
connect();

//setting express app
app = express();
app.engine("ejs", ejsmate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views"));

app.use(express.urlencoded({ extended: true }));
app.use(methodover("_method"));
app.use(express.static(path.join(__dirname, "/public")));
const sessionConfig = {
  secret: "thisisasecret",
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
};
app.use(session(sessionConfig));
app.use(flash());
app.use((req, res, next) => {
  res.locals.current_user = req.session.__id;
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});

app.get("/", (req, res) => {
  res.render("Home.ejs");
});
app.get(
  "/home",
  catchAsync((req, res) => {
    res.render("Home.ejs");
  })
);

//Handling Requests (Admin page)

app.get("/admin/requests",(req,res)=>{
res.render("Users/admin_requests.ejs")
})






//Register Students,Drivers,Employees

app.get("/register",isLoggedIn,isAdmin, catchAsync(async(req, res) => {
  const [rows1] = await con.execute(`SELECT route.RouteID RouteID,route_destinations.DestName DestName FROM route
  join route_destinations on (route.RouteID=route_destinations.RouteID)
  where Status="inactive" order by route.RouteID`);
  const [rows2] = await con.execute(`SELECT * FROM transport.vehicle
  where VehicleNo not in (select VehicleNo from (driver));`)
  let destinations_route=[];
  for(let row of rows1){
    if(!destinations_route.includes(row.RouteID)){
      destinations_route.push(row.RouteID)
    }
    destinations_route.push(row.DestName)
  }
  const [destinations] = await con.execute(`select * from destinations`);
  res.render("Users/register.ejs",{destinations,destinations_route,vehicles:rows2});
}));

//registering a student

app.post("/student/register",catchAsync(async (req, res) => {
  const [rows1] = await con.execute(`select * from student where CmsID=${req.body.cms}`);
  const [rows2] = await con.execute(`select * from login where Email="${req.body.email}"`);
  const [rows3] = await con.execute(`select DriverID from driver where RouteID in (
    select RouteID from route where RouteID in(
    select RouteID from route_destinations where DestName = "${req.body.dest_name}")
    and ShiftTime = "${req.body.timings}") limit 1`);
  if(rows1[0]){
      req.flash("error", "Student with this CMS ID already exists");
      return res.redirect("/register")
  }
  if(rows2[0]){
      req.flash("error", "Student with this Email already exists");
      return res.redirect("/register")
  }
  const hash = await bcrypt.hash(req.body.password, 12);
  let sql_statement1 =
    `INSERT INTO student VALUES ` +
    `("${req.body.first_name}", "${req.body.last_name}", "${req.body.phnumber}"
  ,"${req.body.cms}","${req.body.email}","${req.body.address}","${req.body.department}",null,"${req.body.dest_name}","${rows3[0].DriverID}","${req.body.starting_date}")`;
  let sql_statement2 =
    `INSERT INTO login VALUES ` +
    `("${req.body.email}", "${hash}", "Student","1")`;
  await con.execute(sql_statement2);
  await con.execute(sql_statement1);
  const [rows4] = await  con.execute(`
  select FreeSlots,RouteID from route where RouteID=(select RouteID from Driver where DriverID=${rows3[0].DriverID})
  and vehicleno = (select vehicleno from Driver where DriverID=${rows3[0].DriverID})
  and ShiftTime="${req.body.timings}"`)
  await con.execute(`update route set FreeSlots=${(rows4[0].FreeSlots)-1} where RouteID="${rows4[0].RouteID}"`)
  req.flash("success", "Registered Student Successfully");
  res.redirect("/home");
})
);

//dynamic change of student register

app.post("/student/register/get_timings",async(req,res)=>{
   const rows=await con.execute(`select ShiftTime from route where RouteID in (
    select distinct RouteID from route_destinations where DestName="${req.body.dest_name}")
    and FreeSlots>0`)
    res.json({
      msg: 'success',
      timings: rows
      });
})

// student Invoice

app.get("/student/invoice",(req,res)=>{
  res.render("Users/student_invoice.ejs")
})


// registering a driver

app.post("/driver/register",catchAsync(async (req, res) => {
  const hash = await bcrypt.hash(req.body.password, 12);
  const [rows1] = await con.execute("select max(DriverID) max_id from driver");
  const [rows2] = await con.execute(`select * from login where Email="${req.body.email}"`);
  if(rows2[0]){
      req.flash("error", "Driver with this Email already exists");
      return res.redirect("/register")
  }
  let sql_statement2 =
    `INSERT INTO driver VALUES ` +
    `("${rows1[0].max_id + 1}", "${req.body.first_name}", "${
      req.body.last_name
    }", "${req.body.phnumber}"
  ,"${req.body.email}","${req.body.cnic}","${req.body.vehicle}",
  "${req.body.route}","${req.body.address}","${req.body.date}",null)`;
    let sql_statement1 =
    `INSERT INTO login VALUES ` +
    `("${req.body.email}", "${hash}", "Driver","1")`;
  await con.execute(sql_statement1);
  await con.execute(sql_statement2);
  const [rows3] = await con.execute(`select NumOfSeats from vehicle where VehicleNo="${req.body.vehicle}"`)
  await con.execute(`update route
  set Status="active" ,VehicleNo="${req.body.vehicle}" ,FreeSlots=${rows3[0].NumOfSeats} where RouteID="${req.body.route}"`);
  await con.execute(`insert into dsalary values
                     (${rows1[0].max_id + 1},"2023-11-11",50000,"unpaid")`)
  req.flash("success", "Registered Driver Successfully");
  res.redirect("/home");
})
);

//dynamic change of driver register

app.post("/driver/register/get_timings",async(req,res)=>{
   const rows=await con.execute(`select ShiftTime from route where RouteID ="${req.body.route_id}"`)
    res.json({
      msg: 'success',
      timings: rows
      });
})

// Driver Salary

app.get("/driver/salary",(req,res)=>{
     res.render("Users/driver_salary.ejs");
})


//registering an Employee

app.post("/employee/register",catchAsync(async (req, res, next) => {
  const hash = await bcrypt.hash(req.body.password, 12);
  const [rows1] = await con.execute("select max(EmpID) max_id from employee");
  const [rows2] = await con.execute(`select * from login where Email="${req.body.email}"`);
  if(rows2[0]){
      req.flash("error", "Employee with this Email already exists");
      return res.redirect("/register")
  }
  let sql_statement2 =
    `INSERT INTO employee VALUES ` +
    `("${rows1[0].max_id + 1}", "${req.body.first_name}", "${
      req.body.last_name
    }", "${req.body.phnumber}"
  ,"${req.body.email}", "${req.body.date}",null,"${req.body.address}","${req.body.job_name}")`;
  let sql_statement1 =
  `INSERT INTO login VALUES ` +
  `("${req.body.email}", "${hash}", "Employee","1")`;
  await con.execute(sql_statement1);
  await con.execute(sql_statement2);
  const [rows3] = await con.execute(`select * from empdetails where JobName="${req.body.job_name}"`);
  await con.execute(`insert into esalary
                       values     
                  (${rows1[0].max_id + 1},"2023-11-11",${rows3[0].SalAmnt},"unpaid")`)
  req.flash("success", "Registered Employee Successfully");
  res.redirect("/home");
})
);

//  employee salary

app.get("/employee/salary",(req,res)=>{
  res.render("Users/employee_salary.ejs");
})

//Manage Students
app.get(
  "/managestudents",
  catchAsync(async (req, res) => {
    const [rows] = await con.query(
      `select FirstName,LastName,Email,CmsID,Phone,DestName, DriverID, Enddate from student`
    );
    res.render("Users/managestudents.ejs", { rows });
  })
);
app.get(
  "/searchstudents",
  catchAsync(async (req, res) => {
    var searchdata = req.query.searchdata;
    var sql =
      "select * from student WHERE FirstName LIKE '%" +
      searchdata +
      "%' OR LastName LIKE '%" +
      searchdata +
      "%' OR Email LIKE '%" +
      searchdata +
      "%' OR CmsID LIKE '%" +
      searchdata +
      "%' OR Phone LIKE'%" +
      searchdata +
      "%' OR DestName LIKE '%" +
      searchdata +
      "%' OR DriverID LIKE '%" +
      searchdata +
      "%' OR Enddate LIKE '%" +
      searchdata +
      "%'";
    const [rows] = await con.query(sql);
    res.render("Users/managestudents.ejs", { rows });
  })
);

//Manage Drivers
app.get(
  "/managedrivers",
  catchAsync(async (req, res) => {
    const [rows] = await con.query(
      `select DriverID,FirstName,LastName,Email,CNIC,Phone,vehicleno,RouteID,EndDate from driver`
    );
    res.render("Users/managedrivers.ejs", { rows });
  })
);

app.get(
  "/searchdrivers",
  catchAsync(async (req, res) => {
    var searchdata = req.query.searchdata;
    var sql =
      "select * from driver WHERE FirstName LIKE '%" +
      searchdata +
      "%' OR LastName LIKE '%" +
      searchdata +
      "%' OR Email LIKE '%" +
      searchdata +
      "%' OR CNIC LIKE '%" +
      searchdata +
      "%' OR Phone LIKE'%" +
      searchdata +
      "%' OR RouteID LIKE '%" +
      searchdata +
      "%' OR vehicleno LIKE '%" +
      searchdata +
      "%' OR EndDate LIKE '%" +
      searchdata +
      "%' OR DiverID LIKE '%" +
      searchdata +
      "%'";
    const [rows] = await con.query(sql);
    res.render("Users/managedrivers.ejs", { rows });
  })
);

//Manage Employees
app.get(
  "/manageemployees",
  catchAsync(async (req, res) => {
    const [rows] = await con.query(
      `select EmpID,FirstName,LastName,Email,Phone,JobName,endDate from employee`
    );
    res.render("Users/manageemployees.ejs", { rows });
  })
);
app.get(
  "/searchemployees",
  catchAsync(async (req, res) => {
    var searchdata = req.query.searchdata;
    var sql =
      "select * from employee WHERE FirstName LIKE '%" +
      searchdata +
      "%' OR LastName LIKE '%" +
      searchdata +
      "%' OR EmpID LIKE '%" +
      searchdata +
      "%' OR Email LIKE '%" +
      searchdata +
      "%' OR CNIC LIKE '%" +
      searchdata +
      "%' OR Phone LIKE'%" +
      searchdata +
      "%' OR JobName LIKE '%" +
      searchdata +
      "%' OR endDate LIKE '%" +
      searchdata +
      "%'";
    const [rows] = await con.query(sql);
    res.render("Users/manageemployees.ejs", { rows });
  })
);
app.get("/routes/manage",catchAsync( async(req, res) => {
  let destination_array=[]
  const [rows1] = await con.execute( `select * from destinations`);
  const [rows2] = await con.execute(`SELECT distinct RouteID,ShiftTime FROM route order by RouteID`);
 
  for(let row of rows2){
    let [rows3] = await con.execute(`SELECT DestName FROM route_destinations where 
      RouteID='${row.RouteID}' order by RouteID`);
    for (let row3 of rows3){
      destination_array.push(row3.DestName)
    } 
  }

    res.render("Users/manageroutes.ejs",{destination_list:rows1,route_ids:rows2,destination_array});
  })
);



//Add new Destination

app.post("/destinations/new",async(req,res)=>{
  const [rows1] = await con.execute(`select * from destinations where DestName="${req.body.destination_name}"`);
  if(rows1[0]){
    req.flash("error", "Destination with this name already exists");
    return res.redirect("/routes/manage")
    }
    const sql_statement1 = `INSERT INTO destinations VALUES ` +
    `("${req.body.destination_name}", ${req.body.student_fare})`;
    await con.execute(sql_statement1);
    req.flash("success", "Added New Destination");
    res.redirect("/routes/manage");
})


//Render Edit Destination

app.get("/destination/:id/edit",async(req,res)=>{
  let destination_array=[]
  const [rows1] = await con.execute( `select * from destinations`);
  const [rows2] = await con.execute(`SELECT distinct RouteID,ShiftTime FROM route order by RouteID`);
 
  for(let row of rows2){
    let [rows3] = await con.execute(`SELECT DestName FROM route_destinations where 
      RouteID='${row.RouteID}' order by RouteID`);
    for (let row3 of rows3){
      destination_array.push(row3.DestName)
    } 
  }
    const {id} =  req.params;
    const [rows4]=await con.execute(`select * from destinations where DestName="${id}"`);
    res.render("Users/manageroutes_edit_destinations.ejs",{upd_destination:rows4[0],destination_list:rows1,route_ids:rows2,destination_array})
})
//Edit Destination

app.put("/destination/:id",async(req,res)=>{
  const{id} = req.params;
  await con.execute(`Update destinations set EquivDFare=${req.body.student_fare}
  where DestName ="${id}"`)
  req.flash("success", "Destination Fare updated Successfully");
  res.redirect("/routes/manage")
})

//Delete Destination

app.delete("/destination/:id",async (req,res)=>{
  const{id}=req.params;
  const [rows1] = await con.execute( `SELECT distinct DestName FROM route_destinations;`);
  for(let row of rows1){
   if(row.DestName==id){
     req.flash("error", "Destination Exist in Routes");
      return res.redirect("/routes/manage")
   }
  }
  await con.execute(`Delete from destinations where DestName="${id}"`);
  req.flash("success", "Destination Deleted Successfully");
  res.redirect("/routes/manage");
})
  

//Add new Routes

app.post("/routes/new",catchAsync(async(req,res)=>{
  const [rows1] = await con.execute(`select * from route where RouteID="${req.body.route_id}"`);
  if(rows1[0]){
    req.flash("error", "Route with this ID already exists");
    return res.redirect("/routes/manage")
    }
  if(req.body.station_1==req.body.station_2 || req.body.station_2==req.body.station_3 || req.body.station_3==req.body.station_1)
  {
    req.flash("error","All Stations must be Unique")
    return res.redirect("/routes/manage")
  }  
  const sql_statement1 = `INSERT INTO route VALUES ` +
  `("${req.body.route_id}",null,null,"${req.body.time}","inactive")`;
  const sql_statement2 = `INSERT INTO route_destinations VALUES ` +
  `("${req.body.route_id}","${req.body.station_1}")`;
  const sql_statement3 = `INSERT INTO route_destinations VALUES ` +
  `("${req.body.route_id}","${req.body.station_2}")`;
  const sql_statement4 = `INSERT INTO route_destinations VALUES ` +
  `("${req.body.route_id}","${req.body.station_3}")`;
   
   await con.execute(sql_statement1);
   await con.execute(sql_statement2);
   await con.execute(sql_statement3);
   await con.execute(sql_statement4);
   req.flash("success", "Added New Route");
   res.redirect("/routes/manage");
}))

//Delete Routes

app.delete("/routes/:id",async(req,res)=>{
  const{id}=req.params;
  await con.execute(`Delete from route_destinations where RouteID="${id}"`)
  await con.execute(`Delete from route where RouteID="${id}"`)
  req.flash("success", "Route Deleted Successfully");
  res.redirect("/routes/manage");
})

app.get(
  "/managevehicles",
  catchAsync((req, res) => {
    res.render("Users/managevehicles.ejs");
  })
);
app.get("/user/profile/:id",isLoggedIn, catchAsync(async (req, res) => {
    let email1=req.params.id;
    let email2 = req.session.__id;
    const [account1] = await con.execute(`select * from login where Email="${email1}"`)
    const [account2] = await con.execute(`select * from login where Email="${email2}"`)
    if((account1[0] && account1[0].UserRole=="Student") || (account2[0] && account2[0].UserRole=="Student")){
    let rows1;
    if(account1[0] && account1[0].UserRole=="Student"){
    rows1 = await con.execute( `select * from student where Email="${email1}"`);
    }else if (account2[0] && account2[0].UserRole=="Student"){
    rows1 = await con.execute( `select * from student where Email="${email2}"`);
    }
    const [rows2] = await con.execute(`select * from driver where DriverID=${rows1[0][0].DriverID}`)
    const [rows3] = await con.execute(`select * from route where RouteID="${rows2[0].RouteID}"`);
    const [rows4] = await con.execute(`select * from destinations where DestName="${rows1[0][0].DestName}"`)
    return res.render("Users/student_profile.ejs", { info:rows1[0][0] ,Driver:rows2[0], Route:rows3[0],Destination:rows4[0]});
    }else if((account1[0] && account1[0].UserRole=="Driver") || (account2[0] && account2[0].UserRole=="Driver")){
      let rows1;
      if(account1[0] && account1[0].UserRole=="Driver"){
      rows1 = await con.execute(`select * from driver where Email="${email1}"`);
      }else if (account2[0] && account2[0].UserRole=="Driver"){
        rows1 = await con.execute(`select * from driver where Email="${email2}"`)
      }
    
    const [rows2] = await con.execute(`select * from route where RouteID="${rows1[0][0].RouteID}"`);
    const [rows3] = await con.execute(`select * from dsalary where DriverID=${rows1[0][0].DriverID}`)
    res.render("Users/driver_profile.ejs",{Driver:rows1[0][0],Route:rows2[0],Dr_details:rows3[0]})
    }
    else if((account1[0] && account1[0].UserRole=="Employee") || (account2[0] && account2[0].UserRole=="Employee")){
      let rows1;
      if(account1[0] && account1[0].UserRole=="Employee"){
        rows1 = await con.execute(`select * from employee where Email="${email1}"`)
      }else if (account2[0] && account2[0].UserRole=="Employee"){
        rows1 = await con.execute(`select * from employee where Email="${email2}"`)
      }
    const [rows2] = await con.execute(`select * from ESalary where EmpID=${rows1[0][0].EmpID}`)
    res.render("Users/employee_profile.ejs",{Employee:rows1[0][0],Emp_details:rows2[0]})
    }else {
      req.flash("error", "Profile Not Found");
      res.redirect("/home");
    }
  }));
app.get("/logout",(req,res)=>{
    req.session.__id=null;
    req.flash("success", "Logged Out Successfully");
    res.redirect("/home");
})
app.post("/login", catchAsync(async (req, res) => {
    const Email = req.body.username;
    const AccPassword = req.body.password;
    const UserRole = req.body.role;
    const [rows] = await con.execute(
      `select * from login where Email="${Email}"`
    );
    if (rows[0]) {
      const validPass = await bcrypt.compare(AccPassword, rows[0].AccPassword);
      if (validPass && rows[0].UserRole == UserRole) {
        req.session.__id=Email;
        req.flash("success", "Logged in Successfully");
        res.redirect("/home");
      } else {
        req.flash("error", "Incorrect Id or Password");
        res.redirect("/home");
      }
    } else {
      req.flash("error", "Incorrect Id or Password");
      res.redirect("/home");
    }
  })
);



app.get("/vehicle_register",async(req,res)=>{
      const [rows] = await con.execute(`select * from vehicle`);
      // for(let row of rows){
      //   console.log(row.Color)
      // }
      res.render("vehicles/vehicle_register.ejs",{rows})
})
app.post("/vehicle_register",async(req,res)=>{
  const sql_statement1 = `INSERT INTO vehicle VALUES ` +
  `("${req.body.plate_no}", ${req.body.total_seats}, "${req.body.color}","${req.body.model}")`
      await con.execute(`SET FOREIGN_KEY_CHECKS=0`);
      await con.execute(sql_statement1);
      await con.execute(`SET FOREIGN_KEY_CHECKS=1`);
      req.flash("success", "Registered Vehicle Successfully");
      res.redirect("/vehicle_register");
})





app.get(
  "/user",
  catchAsync((req, res) => {
    const users = ["Abubakar", "emaan", "Umair"];
    throw new ExpressError();
    res.render("user.ejs", { users });
  })
);
app.all("*", (req, res, next) => {
  next(new ExpressError("404 Not Found", 404));
});
app.use((err, req, res, next) => {
  const { statusCode = 500, message = "Something went wrong" } = err;
  res.status(statusCode);
  res.render("error.ejs", { err });
});

app.listen(3000, () => {
  console.log("Started listening at port 3000");
});
