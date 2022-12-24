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

app.get("/routes/destination/:id/edit_destinations",async(req,res)=>{
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
app.put("/routes/destination/:id",async(req,res)=>{
  const{id} = req.params;
  await con.execute(`Update destinations set EquivDFare=${req.body.student_fare}
  where DestName ="${id}"`)
  req.flash("success", "Destination Fare updated Successfully");
  res.redirect("/routes/manage")
})
app.delete("/routes/:id",async(req,res)=>{
     const{id}=req.params;
     await con.execute(`Delete from route_destinations where RouteID="${id}"`)
     await con.execute(`Delete from route where RouteID="${id}"`)
     req.flash("success", "Route Deleted Successfully");
     res.redirect("/routes/manage");
})
app.delete("/routes/destination/:id",async (req,res)=>{
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
app.post("/routes/add/destinations",async(req,res)=>{
  const sql_statement1 = `INSERT INTO destinations VALUES ` +
    `("${req.body.destination_name}", ${req.body.student_fare})`;
    await con.execute(sql_statement1);
    
    res.redirect("/routes/manage");
})
app.post("/routes/add/details",catchAsync(async(req,res)=>{
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
   
   res.redirect("/routes/manage");
}))
app.get(
  "/managevehicles",
  catchAsync((req, res) => {
    res.render("Users/managevehicles.ejs");
  })
);
app.get("/profile",isLoggedIn, catchAsync(async (req, res) => {
    let cms_id = 352147;
    const [rows] = await con.execute( `select * from student where CmsID=${cms_id}`);
    let info = rows[0];
    res.render("Users/profile.ejs", { info });
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

app.get("/register",catchAsync(async(req, res) => {
   const [destinations] = await con.execute(`select * from destinations`);
   res.render("Users/register.ejs",{destinations,scripts: [
    'javascripts/yourFile.js'
 ]});
}));
app.post("/student/register/get_timings",async(req,res)=>{
  console.log("inside post")
   const rows=await con.execute(`select ShiftTime from route where RouteID in (
    select distinct RouteID from route_destinations where DestName="${req.body.dest_name}")
    and FreeSlots>0`)
    res.json({
      msg: 'success',
      timings: rows
      });
})





app.post("/student/register",catchAsync(async (req, res) => {
  
    const [rows1] = await con.execute(`select * from student where CmsID=${req.body.cms}`);
    const [rows2] = await con.execute(`select * from student where Email="${req.body.email}"`);
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



app.post("/employee_register",catchAsync(async (req, res, next) => {
    const hash = await bcrypt.hash(req.body.password, 12);
    const [rows1] = await con.execute("select max(EmpID) max_id from employee");
    const [rows2] = await con.execute(`select * from student where Email="${req.body.email}"`);
    if(rows2[0]){
        req.flash("error", "Employee with this Email already exists");
        return res.redirect("/register")
    }
    let sql_statement1 =
      `INSERT INTO employee VALUES ` +
      `("${rows1[0].max_id + 1}", "${req.body.first_name}", "${
        req.body.last_name
      }", "${req.body.phnumber}"
    ,"${req.body.email}", current_date(),"${req.body.position}")`;
    let sql_statement2 =
    `INSERT INTO login VALUES ` +
    `("${req.body.email}", "${hash}", "Employee")`;
    await con.execute(`SET FOREIGN_KEY_CHECKS=0`);
    await con.execute(sql_statement1);
    await con.execute(sql_statement2);
    await con.execute(`SET FOREIGN_KEY_CHECKS=1`);
    req.flash("success", "Registered Employee Successfully");
    res.redirect("/home");
  })
);
app.post("/driver_register",catchAsync(async (req, res) => {
    const hash = await bcrypt.hash(req.body.password, 12);
    const [rows1] = await con.execute("select max(DriverID) max_id from driver");
    const [rows2] = await con.execute(`select * from student where Email="${req.body.email}"`);
    if(rows2[0]){
        req.flash("error", "Driver with this Email already exists");
        return res.redirect("/register")
    }
    let sql_statement1 =
      `INSERT INTO driver VALUES ` +
      `("${rows1[0].max_id + 1}", "${req.body.first_name}", "${
        req.body.last_name
      }", "${req.body.phnumber}"
    ,"${req.body.email}","${req.body.cnic}",1, "${req.body.plate_no}","${
        req.body.route_id
      }")`;
      let sql_statement2 =
      `INSERT INTO login VALUES ` +
      `("${req.body.email}", "${hash}", "Driver")`;
    await con.execute(`SET FOREIGN_KEY_CHECKS=0`);
    await con.execute(sql_statement1);
    await con.execute(sql_statement2);
    await con.execute(`SET FOREIGN_KEY_CHECKS=1`);
    req.flash("success", "Registered Driver Successfully");
    res.redirect("/home");
  })
);
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
