const express = require('express');
const layouts = require('express-ejs-layouts');
const dasincoming = require('./controllers/dasincoming');
const dastransact = require('./controllers/dastransact');
const dasmonitor = require('./controllers/dasmonitor');
const dasroyalty = require('./controllers/dasroyalty');
const dasfileoperation = require('./controllers/dasfileoperation');
const dassysadmin = require('./controllers/dassysadmin');
const dassearch = require('./controllers/dassearch');
const login = require('./controllers/login')
const dbhandle = require('./controllers/dbhandle');
var app = express();

//View Engine
app.set('view engine','ejs');

//bootstap static folder
app.use(express.static('./public'));
app.use(layouts);

//export db collections
var classModel = dbhandle.disModel('class');
var tagModel = dbhandle.disModel('tag');
var brModel = dbhandle.disModel('branch')
var arrDB = {class:classModel,tag:tagModel,branch:brModel};

//run controllers
dasmonitor(app, arrDB);
dasroyalty(app,arrDB);
dasincoming(app, arrDB);
dastransact(app,arrDB);
dasfileoperation(app,arrDB);
dassysadmin(app,arrDB);
dassearch(app,arrDB);
login(app);

app.listen(80);
console.log('DocMS running');


//data.text_pages.forEach(function(text){
//  console.log(text);
//});
