const mongoose = require('mongoose');
const {Schema} = mongoose;
const hash = require('jshashes');
const crypto = require('crypto');


//Get the default connection
mongoose.connect('mongodb://127.0.0.1/docMS', { useNewUrlParser: true, useUnifiedTopology: true });
var db = mongoose.connection;
//Bind connection to error event (to get notification of connection errors)
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

//Dcoument Schema
const docSchema = new Schema({
  id:String,
  title: String,
  filename: String,
  category: String,
  projects: [],
  author: String,
  deyt: Date,
  size: Number,
  content: String,
  routeslip: String,
  reference: [],
  enclosure: [],
  reference: [],
  comment: [],
});
//User Accounts DB
const userSchema = new Schema({
  userN: String,
  hashP: String,
  email: String,
  salt: String,
  group:String,
  level: String,
  path: String,
  mailfiles:[],
});
//Monitoring DB
const monitorSchema = new Schema({
  title: String,
  filename: String,
  filepath: String,
  route:[{
        deyt: String,
        branch: [],
      }],
});
//server settings
const settingSchema = new Schema({
  server:String,
  maindrive: String,
  publicdrive: String,
  publicstr: String,
});
//count logs of all commo
const commologsSchema = new Schema({
  year: String,
  month: String,
  branch: String,
  count: Number,
});
//compile model from schema
var docModel = new mongoose.model('pnDocs',docSchema);
var userModel = new mongoose.model('userAccs',userSchema);
var monitorModel = new mongoose.model('monitorAccs',monitorSchema);
var settingModel = new mongoose.model('settings',settingSchema);
var commologsModel = new mongoose.model('commologs',commologsSchema);
//var branchModel = new mongoose.model('branch',new Schema({name: String}));
//var classModel = new mongoose.model('class',new Schema({name: String}));

exports.disModel = function(collName){
  return mongoose.model(collName,new Schema ({name:String}));
};
//create List
exports.createList = function createList(disModel, title){
  newModel = new disModel({name:title});
  newModel.save();
};
//Find Lists

exports.findList = function findList(disModel, title, callback){
  var ret = 'Found';
  disModel.findOne({name:{'$regex':'^'+title+'$','$options':'i'}}, function (err, res){
    if (!res) ret = 'Not Found';
    callback(ret);
  });
};
//Enumerate Lists
exports.generateList = function generateList(disModel,callback){
  //find file
  disModel.find(function (err, res){

    var lists = [];
    try{
      res.forEach (function (names){
        lists.push(names.name);
      });
    } catch{}

    callback(lists);
  });
};
//Add to Lists
exports.addList = function addList(disModel, title){
  //find file
  disModel.findOne({name:{'$regex':'^'+title+'$','$options':'i'}}, function (err, res){
    if (!res){
      newModel = new disModel({name:title});
      newModel.save();
    }
  });
};
//Add to Lists
exports.addListCall = function addList(disModel, title, callback){
  //find file
  disModel.findOne({name:{'$regex':'^'+title+'$','$options':'i'}}, function (err, res){
    if (!res){
      newModel = new disModel({name:title});
      newModel.save();callback(true);
    } else callback(false);
  });
};
//Remove documents
exports.delList = function (disModel, title, callback){
  //find file
      disModel.deleteMany({name:{'$regex':'^'+title+'$','$options':'i'}},function (err){

        console.log('Deleted successfully!');
        callback();
      });
};
//find monitoring by title
exports.genMonitor = function genMonitor(callback){
  //find file
  monitorModel.find(function (err, res){

    //console.log(res);
    callback(res);
  });
};

//find monitoring by title
exports.monitorFindTitle = function monitorFindTitle(title, callback){
  //find file
  monitorModel.findOne({title:{'$regex':'^'+title+'$','$options':'i'}}, function (err, res){

    //console.log(res);
    callback(res);
  });
};
//find monitoring by filename
exports.monitorFindFile = function monitorFindFile(title, callback){
  //find file
  monitorModel.findOne({filename:{'$regex':'^'+title+'$','$options':'i'}}, function (err, res){

    //console.log(res);
    callback(res);
  });
};
//find monitoring by branch
exports.monitorFindBranch = function monitorFindBranch(title, callback){
  //find file
  monitorModel.findMany({branch:{'$regex':'^'+title+'$','$options':'i'}}, function (err, res){

    //console.log(res);
    callback(res);
  });
};
//Remove documents in monitoring
exports.monitorDel = function monitorDel(filename, callback){
  //find file
  monitorModel.deleteMany({filename:{'$regex':'^'+filename+'$','$options':'i'}},function (err){

    console.log('Deleted successfully!');
    callback();
  });
};
//add documents to monitoring
exports.monitorCreate = function monitorCreate(Title, Filename, Deyt, Branch, Filepath){
  //Create records
  var newDoc = new monitorModel({
    title: Title,
    filename: Filename,
    filepath: Filepath,
    route:[{
          deyt: Deyt,
          branch: Branch,
        }],
  });
  newDoc.save(function(err){

    console.log('Added successfully!')
  });
};
//add documents to monitoring
exports.monitorEdit = function monitorEdit(Title, Filename, Deyt, Branch, Filepath){
  //Create records
  var disDoc = {
    filename: Title,
    filepath: Filepath,
    route:[{
          deyt: Deyt,
          branch: Branch,
        }],
  };
  monitorModel.updateOne({filename:{'$regex':'^'+Filename+'$','$options':'i'}},[{$set:disDoc}], function(err){

    console.log('Updated successfully!');
  });
};
//add documents to monitoring
exports.monitorUpdateTitle = function (Title, Filename){
  //Create records
  var disDoc = {
    title: Title,
  };
  monitorModel.updateOne({filename:{'$regex':'^'+Filename+'$','$options':'i'}},[{$set:disDoc}], function(err){

    console.log('Updated successfully!');
  });
};
//add documents to monitoring
exports.monitorUpdateFile = function (oldFile, newFile, Route, Filepath, callback){
  //Create records
  var disDoc = {
    filename: newFile,
    filepath: Filepath,
    route: Route,
  };
  monitorModel.updateOne({filename:{'$regex':'^'+oldFile+'$','$options':'i'}},[{$set:disDoc}], function(err){

    console.log('Updated successfully!');
    callback();
  });
};
//add documents to monitoring
exports.monitorAddRoute = function monitorAddRoute(Title, Filename, Route, Filepath){
  //Create records
  var disDoc = {
    filename:Title,
    filepath: Filepath,
    route: Route,
  };
  monitorModel.updateOne({filename:{'$regex':'^'+Filename+'$','$options':'i'}},[{$set:disDoc}], function(err){

    console.log('Updated successfully!');
  });
};

//find document
exports.docFind = function docFind(filename, callback){
  //find file
  //console.log(filename);
  docModel.findOne({filename:{'$regex':'^'+filename+'$','$options':'i'}}, function (err, res){
    if (!err) callback(res);
  });
};
//find document by id
exports.docFindbyId = function (Id, callback){
  //find file
  //console.log(filename);
  docModel.findOne({id:Id}, function (err, res){

    //console.log(res);
    callback(res);
  });
};
//create Documents
exports.docCreate = function docCreate(Id, Title, Filename, Category, Author, Projects, Deyt, Size, Content, Rout, Ref, Encl, Comment){
  //Create records
  var newDoc = new docModel({
    id:Id,
    title:Title,
    filename:Filename,
    category:Category,
    author:Author,
    projects:Projects,
    deyt:Deyt,
    size:Size,
    content:Content,
    routeslip: Rout,
    reference: Ref,
    enclosure: Encl,
    comment: Comment
  });
  newDoc.save(function(err){

    console.log('Added successfully!')
  });
};
//Update Document except reference and enclosure
exports.docUpdateNoRefEnc = function docUpdateNoRefEnc(Id, Filename, Rout, Comment){
  //Create records
  var disDoc = {
    filename:Filename,
    routeslip: Rout,
    comment:Comment
  };
  docModel.updateOne({id:Id},[{$set:disDoc}], function(err){

    console.log('Updated successfully!');
  });
};
//edit Documents date, size, title, filename, and content only
exports.docEditWatch = function(Id, Title, Filename, Deyt, Size, Content){
  //Create records
  var disDoc = {
    title:Title,
    filename:Filename,
    deyt:Deyt,
    size:Size,
    content:Content
  };
  docModel.updateOne({id:Id},[{$set:disDoc}], function(err){

    console.log('Updated successfully!');
  });
};
//edit Documents
exports.docEdit = function docEdit(Id, Title, Filename, Category, Author, Projects, Deyt, Size, Content, Rout, Ref, Encl, Comment){
  //Create records
  var disDoc = {
    title:Title,
    filename:Filename,
    category:Category,
    author:Author,
    projects:Projects,
    deyt:Deyt,
    size:Size,
    content:Content,
    routeslip: Rout,
    reference: Ref,
    enclosure: Encl,
    comment:Comment
  };
  docModel.updateOne({id:Id},[{$set:disDoc}], function(err){

    console.log('Updated successfully!');
  });
};

//Remove documents
exports.docDel = function docDel(filename, callback){
  //find file
  docModel.deleteMany({filename:{'$regex':'^'+filename+'$','$options':'i'}},function (err){
    if (!err) {
      console.log('Deleted successfully!');
      callback();
    }
  });
};

//Find User
exports.userFind = function userFind(name, callback){
  //find file
  var ret = {};
  userModel.findOne({ userN:{'$regex':'^'+name+'$','$options':'i'} }, function(err, user){
    if (!err) {
      if (!user) ret = {result:'notFound'};
      else ret = user;
      callback(ret);
    }
  });
};
//Remove user account
exports.userDel = function (name, callback){
  //find file
  userModel.deleteMany({userN:{'$regex':'^'+name+'$','$options':'i'}},function (err){
    if (!err) {
      console.log('Deleted successfully!');
      callback();
    }
  });
};
//Find Users in group
exports.groupFind = function (name, callback){
  //find file
  userModel.find({ group:{'$regex':'^'+name+'$','$options':'i'} }, function(err, userB){

    branch = [];
    userB.forEach(function (disUser){
      branch.push(disUser.userN);
    });
    userModel.find(function(err, userO){
      others = [];
      userO.forEach(function (disOth){
        if (disOth.group.toUpperCase()!=name.toUpperCase()) others.push(disOth.userN);
      });
      var allUsers = [{branch:branch, others:others}]
      callback(allUsers);
    })
  });
};
//Create User AccountsS
exports.userCreate = function (UserN, PassW, Email, Group, Level, Path, Files) {
    //Create records
  //var hashVal = new hash.SHA512().b64(PassW);
  var hashVal = PassW;
  var salt = crypto.randomBytes(16).toString('hex');
  var passCrypt = crypto.pbkdf2Sync(hashVal, salt, 10000, 512, 'sha512').toString('hex');
  //var dislevel=dutyAdmin, sysAdmin, dutyBranch, oicBranch, exo, dep, co
  var newUser = new userModel({userN:UserN, hashP:passCrypt, email:Email, salt:salt, group:Group, level:Level, path:Path, mailfiles:Files});
  newUser.save(function(err){

    console.log('saved successfully!')
  });
};
//Generate All Users
exports.genUsers = function (callback){
  userModel.find(function (err, res){

    callback(res);
  });
};
//Update Users
exports.userUpdate = function (UserN, PassW, Email, Salt, Group, Level, Path, Files, callback){
  //Create records
  var disUser = {hashP:PassW, email:Email, salt:Salt, group:Group, level:Level, path:Path, mailfiles:Files}
  userModel.updateOne({userN:{'$regex':'^'+UserN+'$','$options':'i'}},[{$set:disUser}], function(err){

    console.log('Updated successfully!');
    callback();
  });
};
//Update Users
exports.userUpdPass = function (UserN, PassW, Email, Group, Level, Path, Files){
  //Create records
  //var hashVal = new hash.SHA512().b64(PassW);
  var hashVal = PassW;
  var salt = crypto.randomBytes(16).toString('hex');
  var passCrypt = crypto.pbkdf2Sync(hashVal, salt, 10000, 512, 'sha512').toString('hex');
  var disUser = {hashP:passCrypt, email:Email, salt:salt, group:Group, level:Level, path:Path, mailfiles:Files}
  if (PassW=='') disUser = {email:Email, group:Group, level:Level, path:Path, mailfiles:Files}
  userModel.updateOne({userN:{'$regex':'^'+UserN+'$','$options':'i'}},[{$set:disUser}], function(err){

    console.log('Updated successfully!');
  });
};
exports.validatePassword = function (name, hashVal, callback){
  //var hashVal = new hash.SHA512().b64(password);
  userModel.findOne({ userN:{'$regex':'^'+name+'$','$options':'i'} }, function(err, user){

    var passCrypt = crypto.pbkdf2Sync(hashVal, user.salt, 10000, 512, 'sha512').toString('hex');
    callback(user.hashP === passCrypt);
  });
};
  //create setting
  exports.settingCreate = function (Maindrive, Publicdrive, Publicstr) {
    var newSetting = new settingModel({server:'localhost', maindrive:Maindrive, publicdrive:Publicdrive, publicstr:Publicstr});
     newSetting.save(function(err){

      console.log('setting saved successfully!')
    });
  };
  //Update setting
  exports.settingUpdate = function (Maindrive, Publicdrive, Publicstr, callback) {
    var disSetting = {maindrive:Maindrive, publicdrive:Publicdrive, publicstr:Publicstr};
    settingModel.updateOne({server:'localhost'},[{$set:disSetting}], function(err){

      console.log('setting updated successfully!')
      callback();
    });
  };
  //create show settings
  exports.settingDis = function (callback) {
    settingModel.findOne({ server:'localhost' }, function(err, setting){

      callback(setting);
    });
  };
  //update commo logs
  exports.commologsUpdate = function (Year, Month, Branch, callback) {
    commologsModel.findOne({year:Year, month:Month, branch:Branch}, function (err, disLog){
      if (!disLog) {
        let newCommologs = new commologsModel({year:Year, month:Month, branch:Branch, count:1});
        newCommologs.save(function(err){

         console.log('Commo logs saved successfully!')
         return callback();
        });
      } else {
        let count = disLog.count; ++count;
        let commologs = {count:count}
        commologsModel.updateOne({year:Year, month:Month, branch:Branch},[{$set:commologs}], function(err){

          console.log('Commo logs updated successfully!')
          return callback();
        });
      }
    });
  };
  //Generate commo logs for the year
  exports.commologsGen = function (Year, callback) {
    let allMonth = ['Jan', 'Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    let allBranch = ['N6A','N6B','N6C','N6D','N6E','N6F'];
    let outData = [];
    commologsModel.findOne({year:Year}, function (err, disYear){
      if (!disYear) {
        callback(null);
      } else {
        allMonth.forEach((resMonth, monthIdx)=>{
          allBranch.forEach((resBranch, branchIdx)=>{
            commologsModel.findOne({year:Year, month:resMonth.toUpperCase(), branch:resBranch}, (err,disLog)=>{
              if (!disLog) outData.push({month:resMonth,branch:resBranch,count:0});
              else outData.push({month:resMonth,branch:resBranch,count:disLog.count});
              if ((branchIdx==allBranch.length-1) && (monthIdx==allMonth.length-1)) callback(outData);
            });
          });
        })
      }
    });
  };
