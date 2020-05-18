module.exports = function(app, arrDB){
  var fs = require('fs');
  var path = require('path');
  var bodyParser = require('body-parser');
  const cookieParser = require('cookie-parser');

  const dbhandle = require('./dbhandle');
  const dochandle = require('./dochandle');
  const utilsdocms = require('./utilsdocms');
  const dateformat = require('dateformat');
  var multer = require('multer');

  app.use(cookieParser());
  var urlencodedParser = bodyParser.urlencoded({extended:true});
  var drivetmp = "public/drive/", drive = "D:/Drive/", publicstr = 'public';
  dbhandle.settingDis((setting)=>{drive = setting.maindrive;});
  dbhandle.settingDis((setting)=>{drivetmp = setting.publicdrive;});
  dbhandle.settingDis((setting)=>{publicstr = setting.publicstr;});

  //list all document classification and tags
  var docClass = []; var docTag = []; var docBr = [];    var grpUsrs = [];
  dbhandle.generateList(arrDB.class, function (res){ docClass = res; });
  dbhandle.generateList(arrDB.tag, function (res){ docTag = res; });
  dbhandle.generateList(arrDB.branch, function (res){ docBr = res; });

  //initialize file upload storage
  var storage =   multer.diskStorage({
    destination: function (req, file, callback) { callback(null, drivetmp +'Uploads/'); },
    filename: function (req, file, callback) { callback(null, file.originalname);}
  });
  var avatar = multer({ storage : storage}).single('avatarinput');
  var pngimage = multer({ storage : storage}).single('pnginput');
  var svgimage = multer({ storage : storage}).single('svginput');

  //post upload avatar
  app.post('/avatarupload', urlencodedParser, function(req,res){
    utilsdocms.validToken(req, res, function (decoded, id){
      postavatarUpload(req, res, id);
    });
  });
  //post upload png signature
  app.post('/pngupload', urlencodedParser, function(req,res){
    utilsdocms.validToken(req, res, function (decoded, id){
      postpngUpload(req, res, id);
    });
  });
  //post upload svg signature
  app.post('/svgupload', urlencodedParser, function(req,res){
    utilsdocms.validToken(req, res, function (decoded, id){
      postsvgUpload(req, res, id);
    });
  });
  //post handle registration of users
  app.post('/reguser', urlencodedParser, function(req,res){
    utilsdocms.validToken(req, res, function (decoded, id){
      registeruser(req, res, id);
    });
  });
  //post handle registration of users
  app.post('/updateserver', urlencodedParser, function(req,res){
    utilsdocms.validToken(req, res, function (decoded, id){
      updateserver(req, res, id);
    });
  });
  //get handle administration
  app.get('/kalikot', function(req,res){
    utilsdocms.validToken(req, res, function (decoded, id){
      getkalikot(req, res, id);
    });
  });
  //get handle administration
  app.get('/myprofile', function(req,res){
    utilsdocms.validToken(req, res, function (decoded, id){
      getmyprofile(req, res, id);
    });
  });
  //get handle administration
  app.get('/viewusers', function(req,res){
    utilsdocms.validToken(req, res, function (decoded, id){
      viewusers(req, res, id);
    });
  });
  //get handle administration
  app.get('/configserve/:view', function(req,res){
    utilsdocms.validToken(req, res, function (decoded, id){
      configserve(req, res, id);
    });
  });
  //////////////////////////////////////FUNCTIONS START HERE///////////////////////////////////////////////
  //Process post avatar upload function
  function postavatarUpload(req, res, id){
    console.log("uploading avatar");
    avatar(req, res, function(err){
      if (err) res.json('error');
      else {
        if (fs.existsSync(drivetmp +'Uploads/' + req.cookies.fileAI))
        fs.copyFileSync(drivetmp +'Uploads/' + req.cookies.fileAI, publicstr+'/images/' + id +'.jpg')
        res.json('successful');
      }
    });
  }
  //Process post png upload function
  function postpngUpload(req, res, id){
    console.log("uploading PNG image signature");
    pngimage(req, res, function(err){
      if (err) res.json('error');
      else {
        if (fs.existsSync(drivetmp +'Uploads/' + req.cookies.fileAI))
        dbhandle.userFind(id, function(user){
          if (!fs.existsSync(drive+user.group+'/Signature/')) fs.mkdirSync(drive+user.group+'/Signature');
          fs.copyFileSync(drivetmp +'Uploads/' + req.cookies.fileAI, drive+user.group+'/Signature/' + id +'.png')
          res.json('successful');
        });
      }
    });
  }
  //Process post png upload function
  function postsvgUpload(req, res, id){
    console.log("uploading SVG image signature");
    svgimage(req, res, function(err){
      if (err) res.json('error');
      else {
        if (fs.existsSync(drivetmp +'Uploads/' + req.cookies.fileAI))
        fs.copyFileSync(drivetmp +'Uploads/' + req.cookies.fileAI, publicstr+'/images/' + id +'.svg')
        res.json('successful');
      }
    });
  }
  //process update Profile
  function getmyprofile(req, res, id) {
    //refresh lists
    dbhandle.generateList(arrDB.class, function (res){ docClass = res; });
    dbhandle.generateList(arrDB.tag, function (res){ docTag = res; });
    dbhandle.userFind(id, function(user){
      fs.readdir(drivetmp + user.group, function(err,items){
        if (err) throw err;var def="empty";
        if (items.length > 0) {def=items[0];} var disDrive = '/drive/';var disFile = def;
        if (user.level.toUpperCase()==='DUTYADMIN') {
          return res.render('myprofile', { layout:'layout-receive', release:[], branch:'incoming-temp', mailfiles:user.mailfiles, docPers:[], path:disDrive + 'PDF-temp/'+ disFile + '.pdf', files:items, disp:disFile, docBr:docBr});
        } else if ((user.level.toUpperCase()==='DEP') || (user.level.toUpperCase()==='CO')) {
          return res.render('myprofile', {layout:'layout-royal',  level:user.level, category:'none', mailfiles:user.mailfiles, docPers:[], path:disDrive + 'PDF-temp/'+ disFile +'.pdf', files:items, disp:disFile, branch:user.group});
        } else {
          return res.render('myprofile', {layout:'layout-user', level:user.level, runscanai:'false', mailfiles:user.mailfiles, docPers:[], path:disDrive + 'PDF-temp/'+ disFile +'.pdf', files:items, disp:disFile, branch:user.group, docBr:docBr, docClass:docClass, docTag:docTag});
        }
      });
    });
  }
  //process registration of users
  function updateserver(req, res, id){
    dbhandle.userFind(id, function(user){
      if (user.level.toUpperCase()=='SYSADMIN') {
        //var year = dateformat(Date.now(),'yyyy');var month = dateformat(Date.now(),'mmm').toUpperCase();
        if (req.body.action=='editdrive') {
          console.log('Update Drive Setting');
          dbhandle.settingUpdate(req.body.maindrive,req.body.publicdrive,req.body.publicstr, ()=>{
            res.json('successful');
          });
        } else if (req.body.action=='addgroup') {
          console.log('Add Branch/ Group');
          dbhandle.addListCall(arrDB.branch,req.body.group, (success)=>{
            if (success) res.json('successful');
            else res.json('fail');
          });

        } else if (req.body.action=='delgroup') {
          console.log('Delete Branch/ Group');
          req.body.group.forEach((group, idx)=>{
            dbhandle.delList(arrDB.branch, group, ()=>{
              if (idx==req.body.group.length -1) res.json('successful');
            });
          });
        } else if (req.body.action=='addclass') {
          console.log('Add Classification');
          dbhandle.addListCall(arrDB.class,req.body.class, (success)=>{
            if (success) res.json('successful');
            else res.json('fail');
          });

        } else if (req.body.action=='delclass') {
          console.log('Delete Classification');
          req.body.class.forEach((disclass, idx)=>{
            dbhandle.delList(arrDB.class, disclass, ()=>{
              if (idx==req.body.class.length -1) res.json('successful');
            });
          });
        }
      } else res.json('fail');
    });
  }
  //process default page for System Admin
  function getkalikot(req, res, id){
    dbhandle.userFind(id, function(user){
      if ((user.level.toUpperCase()==='SYSADMIN')) {
        return res.render('register', {layout:'layout-admin', docBr:docBr, level:user.level, mailfiles:user.mailfiles});
      }
    });
  }
  //process page for server configuration
  function configserve(req, res, id){
    dbhandle.userFind(id, function(user){
      if ((user.level.toUpperCase()==='SYSADMIN')) {
        dbhandle.settingDis((setting)=>{
          dbhandle.generateList(arrDB.class, function (res){ docClass = res; });
          dbhandle.generateList(arrDB.branch, function (res){ docBr = res; });
          return res.render('configserve', {layout:'layout-admin', setting:JSON.stringify(setting),view:req.params.view, docBr:docBr, docClass:docClass, level:user.level, mailfiles:user.mailfiles});
        })
      }
    });
  }
  //process view all users
  function viewusers(req, res, id){
    dbhandle.userFind(id, function(user){
      if ((user.level.toUpperCase()==='SYSADMIN')) {
        dbhandle.genUsers(function(users){
          return res.render('tableusers', {layout:'layout-admin', users:JSON.stringify(users), docBr:docBr, level:user.level, mailfiles:user.mailfiles});
        });
      }
    });
  }
  //process registration of users
  function registeruser(req, res, id){
    dbhandle.userFind(id, function(user){
      if (user.level.toUpperCase()=='SYSADMIN') {
        //var year = dateformat(Date.now(),'yyyy');var month = dateformat(Date.now(),'mmm').toUpperCase();
        if (req.body.action=='register'){
          console.log('Register User Account');
          dbhandle.userFind(req.body.userN, function(found){
            if (found.result=='notFound'){
              dbhandle.userCreate(req.body.userN, req.body.hashval, req.body.email, req.body.branch[0], req.body.access[0],req.body.drive,[]);
              res.json('successful');
            } else res.json('fail');
          });
        } else if (req.body.action=='edituser'){
          console.log('Edit User Account');
          dbhandle.userFind(req.body.userN, function(found){
            let oldPass = '';
            if (req.body.hashval!='') oldPass = req.body.hashval;
            dbhandle.userUpdPass(req.body.userN, oldPass, req.body.email, req.body.branch, req.body.level,req.body.drive,[]);
            res.json('successful');
          });
        } else if (req.body.action=='deluser'){
          console.log('Delete User Account');
          dbhandle.userFind(req.body.userN, function(found){
            dbhandle.validatePassword(user.userN,req.body.hashval, function (result){
              if ((result) && (user.userN!=req.body.userN)) {
                dbhandle.userDel(req.body.userN, function(){
                  res.json('successful');
                });
              } else res.json('fail');
            });
          });
        }
      } else res.json('fail');
    });
  }


};
