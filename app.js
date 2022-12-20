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
    database: "project",
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
app.get(
  "/managestudents",
  catchAsync((req, res) => {
    res.render("Users/managestudents.ejs");
  })
);
app.get(
  "/managedrivers",
  catchAsync((req, res) => {
    res.render("Users/managedrivers.ejs");
  })
);
app.get(
  "/manageemployees",
  catchAsync((req, res) => {
    res.render("Users/manageemployees.ejs");
  })
);
app.get(
  "/manageroutes",
  catchAsync((req, res) => {
    res.render("Users/manageroutes.ejs");
  })
);
app.get(
  "/managevehicles",
  catchAsync((req, res) => {
    res.render("Users/managevehicles.ejs");
  })
);
app.get("/profile", catchAsync(async (req, res) => {
    let cms_id = 352147;
    const [rows] = await con.execute(
      `select * from student where CmsID=${cms_id}`
    );
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

app.get("/register",isLoggedIn,isAdmin,(req, res) => {
   res.render("Users/register.ejs");
});
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

app.post("/student_register",catchAsync(async (req, res) => {
    const [rows1] = await con.execute(`select * from student where CmsID=${req.body.cms}`);
    const [rows2] = await con.execute(`select * from student where Email="${req.body.email}"`);
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
    ,"${req.body.cms}","${req.body.email}","${req.body.address}","${req.body.department}",TRUE,null,"${req.body.driver_id}")`;
    let sql_statement2 =
      `INSERT INTO login VALUES ` +
      `("${req.body.email}", "${hash}", "Student")`;
    await con.execute(`SET FOREIGN_KEY_CHECKS=0`);
    await con.execute(sql_statement1);
    await con.execute(sql_statement2);
    await con.execute(`SET FOREIGN_KEY_CHECKS=1`);
    req.flash("success", "Registered Student Successfully");
    res.redirect("/home");
  })
);
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
