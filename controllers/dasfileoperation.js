module.exports = function(app, arrDB){
  var routeduty = require('./routeduty');
  var fs = require('fs');
  var path = require('path');
  var bodyParser = require('body-parser');
  const cookieParser = require('cookie-parser');

  const dbhandle = require('./dbhandle');
  const dochandle = require('./dochandle');
  const monitoring = require('./monitoring');
  const pdflib = require('./pdflib');
  const utilsdocms = require('./utilsdocms');
  const dateformat = require('dateformat');
  var multer = require('multer');

  app.use(cookieParser());
  var urlencodedParser = bodyParser.urlencoded({extended:true});
  var drivetmp = "public/drive/", drive = "D:/Drive/";
  dbhandle.settingDis((setting)=>{drive = setting.maindrive;});
  dbhandle.settingDis((setting)=>{drivetmp = setting.publicdrive;});

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
  var upload = multer({ storage : storage}).single('fileinput');


  //post file open with params
  app.post('/fileopen', urlencodedParser, function(req,res){
    utilsdocms.validToken(req, res, function (decoded, id){
      postFileopen(req, res, id);
    });
  });
  //post show file attachments
  app.post('/showfile', urlencodedParser, function(req,res){
    utilsdocms.validToken(req, res, function (decoded, id){
      showFile(req, res, id);
    });
  });
  //post handle toggle continue routing or new routing slip
  app.get('/downloadfile/:file/:view', function(req,res){
    utilsdocms.validToken(req, res, function (decoded, id){
      downloadfile(req, res, id);
    });
  });
  //post handle delete file
  app.post('/deletedoc', urlencodedParser, function(req,res){
    utilsdocms.validToken(req, res, function (decoded, id){
      deletedoc(req, res, id);
    });
  });
  //get open file no params
  app.get('/fileupload', function(req,res){
    utilsdocms.validToken(req, res, function (decoded, id){
      getFileupload(req, res, id);
    });
  });
  //post upload file
  app.post('/fileupload', urlencodedParser, function(req,res){
    utilsdocms.validToken(req, res, function (decoded, id){
      postFileUpload(req, res, id);
    });
  });
  //post handle delete user mail notification file
  app.post('/delnotifile', urlencodedParser, function(req,res){
    utilsdocms.validToken(req, res, function (decoded, id){
      delNotiFile(req, res, id);
    });
  });
  //handle browse drive
  app.post('/browsedrive', urlencodedParser, function(req,res){
    utilsdocms.validToken(req, res, function (decoded, id){
      console.log('browse drive');
      // Browse folder "directory"
      var arrBr = {
        dirs:utilsdocms.getDirs(req.body.path),
        files:utilsdocms.getFiles(req.body.path)
      }
      res.json(JSON.stringify(arrBr));
    });
  });

  //////////////////////////////////////FUNCTIONS START HERE///////////////////////////////////////////////
  //handle delete documents
  function deletedoc(req,res,id){
    dbhandle.validatePassword(req.body.user,req.body.hashval, function (result){
      if (result) {
        dbhandle.userFind(req.body.user, function (user){
          var filepath = "";
          if (req.body.branch=="fileopen") filepath = req.body.filepath;
          else filepath= drivetmp+req.body.branch+'/'+req.body.filepath;
          //console.log(filepath);
          if (req.body.branch!="fileopen"){ //if routing
            monitoring.getOriginator(req.body.filename, function(branch){
              //console.log(branch.toUpperCase() + req.body.branch.toUpperCase());
              if (branch.toUpperCase() == req.body.branch.toUpperCase()) {
                dbhandle.monitorFindFile(req.body.filename, function(result){ //delete in monitoring
                  if (result) dbhandle.monitorDel(req.body.filename, function(){});
                });
                dbhandle.docFind(filepath, function(docres){ //delete in pndocs
                  if (docres) dbhandle.docDel(filepath,()=>{});
                });
                  res.json('successful');
              } else {
                if (user.level.toUpperCase()=="DUTYADMIN") res.json('successful');
                else res.json('notowner');
              }
            });
          } else {
            dbhandle.docFind(filepath, function(docres){ //delete in pndocs
              if (docres) dbhandle.docDel(filepath,()=>{});
            });
            res.json('successful');
          }
          if (fs.existsSync(filepath)){
            if (!fs.existsSync(drive+'Recoverhere/')) fs.mkdirSync(drive+'Recoverhere/');
            fs.copyFileSync(filepath,drive+'Recoverhere/'+req.body.filename)
            fs.unlink(filepath, (err)=>{if (err) console.log(err);});
          }
          console.log('deleting document');
        });
      } else res.json('fail');
    });
  }
  //process toggle continue routing or new routing slip
  function downloadfile(req, res, id){
    console.log('download file');
    var decode = Buffer.from(req.params.file,'base64').toString('ascii');
    var decodeBr = Buffer.from(req.params.view,'base64').toString('ascii');
    if (decodeBr == 'fileopen'){
      if (fs.existsSync(decode)) res.download(decode);
    } else res.download(path.resolve(drivetmp+decodeBr+'/'+decode));
  }

  //process delete user mail notification file
  function delNotiFile(req, res, id){
    console.log('Delete file from user notification');
    dbhandle.userFind(req.body.user, function (user){
      //console.log(found);
      if (user){
        arrFiles = user.mailfiles.filter(function(res){return res!=req.body.path});
        dbhandle.userUpdate(user.userN, user.hashP, user.email, user.salt, user.group, user.level, user.path, arrFiles, function(){
          res.json(JSON.stringify(arrFiles));
        });
      } else res.json('notfound');
    });
  }
  //Process post file upload function
  function postFileUpload(req, res, id){
    console.log("uploading file");
    upload(req, res, function(err){
      if (err) res.json('error');
      else {
        if (fs.existsSync(drivetmp +'Uploads/' + req.cookies.fileAI))
        fs.copyFileSync(drivetmp +'Uploads/' + req.cookies.fileAI, req.cookies.realpath + req.cookies.fileAI)
        res.json('successful');
      }
    });
  }
  //Process get file upload function
  function getFileupload(req, res, id){
    //refresh lists
    dbhandle.generateList(arrDB.class, function (res){ docClass = res; });
    dbhandle.generateList(arrDB.tag, function (res){ docTag = res; });
    dbhandle.userFind(id, function(user){
      dbhandle.groupFind(user.group, function (groups){
        fs.readdir(drivetmp + user.group, function(err,items){
          if (err) throw err;var def="empty";
          var disDrive = '/drive/';rout= "";ref = [];enc = []; disComm = [];
          if (items.length > 0) {def=items[0];} uploadDrive = drive.substring(0,drive.length-1);
          res.render('uploadfile', {layout:'layout-user', level:user.level, mailfiles:user.mailfiles, docPers:groups, path:uploadDrive, files:items, disp:"Empty File", branch:user.group, docBr:docBr, docClass:docClass, docTag:docTag, rout:rout, ref:ref, enc:enc, disComm:disComm });
        });
      });
    });
  }
  //get open file no params
  app.get('/fileopen', function(req,res){
    utilsdocms.validToken(req, res, function (decoded, id){
      getFileopen(req, res, id);
    });
  });
  //process show file attachment Function
  function showFile(req, res, id){
    dbhandle.userFind(id, function(user){
      var disDrive = '/drive/';
      var disFile = req.body.file; var disPath= req.body.path;
      if (dochandle.getExtension(disFile)!='.pdf'){
        dochandle.convDoctoPDF(disPath+disFile, drivetmp + 'PDF-temp/'+ disFile +'.pdf', function(){
          var arrBr = disDrive + 'PDF-temp/'+ disFile +'.pdf';
          res.json(arrBr);
        });
      }else {
        fs.copyFile(disPath+disFile, drivetmp + 'PDF-temp/'+ disFile, function(err) {
          if (err) throw err;
          var arrBr = disDrive + 'PDF-temp/'+ disFile
          res.json(arrBr);
        });
      }
    });
  }
  //process post file open function
  function postFileopen(req, res, id){
    console.log('file open');
    dbhandle.userFind(id, function(user){
      fs.readdir(drivetmp + user.group, function(err,items){
        if (err) throw err;var def="empty";
        if (items.length > 0) {def=items[0];} var disDrive = '/drive/';
        var disFile = req.body.file; var disPath= req.body.path;
        dbhandle.docFind(disPath+disFile, async function (found){
          rout= "";ref = [];enc = []; disClas = []; disTag = []; disComm = [];
          if (found){
            disComm= found.comment; rout= found.routeslip;ref = found.reference;enc = found.enclosure; disClas = found.category; disTag = found.projects;
          }
          dbhandle.monitorFindFile(disFile, (file)=>{
            utilsdocms.resolveRoutingSlip(found, disFile);
            if (fs.existsSync(disPath+disFile)){
              if (dochandle.getExtension(disFile)!='.pdf'){
                if (fs.existsSync(drivetmp + 'PDF-temp/'+ disFile +'.pdf')) fs.unlinkSync(drivetmp + 'PDF-temp/'+ disFile +'.pdf');
                dochandle.convDoctoPDF(disPath+disFile, drivetmp + 'PDF-temp/'+ disFile +'.pdf', function(){
                  var arrBr = [{disComm:disComm, openpath:user.path, realpath:disPath, path:disDrive + 'PDF-temp/'+ disFile +'.pdf',files:items,disp:disFile,branch:user.group,docClass:docClass, docTag:docTag, rout:rout, ref:ref, enc:enc, disClas:disClas, disTag:disTag}];
                  res.json(JSON.stringify(arrBr));
                });
              }else {
                fs.copyFile(disPath+disFile, drivetmp + 'PDF-temp/'+ disFile, function(err) {
                  if (err) throw err;
                  var arrBr = [{disComm:disComm, openpath:user.path, realpath:disPath, path:disDrive + 'PDF-temp/'+ disFile,files:items,disp:disFile,branch:user.group,docClass:docClass, docTag:docTag, rout:rout, ref:ref, enc:enc, disClas:disClas, disTag:disTag}];
                  res.json(JSON.stringify(arrBr));
                });
              }
            }else {
              res.json(JSON.stringify('notfound'));
            }
          });
        });
      });
    });
  }
  //Process get file open function
  function getFileopen(req, res, id){
    //refresh lists
    dbhandle.generateList(arrDB.class, function (res){ docClass = res; });
    dbhandle.generateList(arrDB.tag, function (res){ docTag = res; });
    dbhandle.userFind(id, function(user){
      dbhandle.groupFind(user.group, function (groups){
        fs.readdir(drivetmp + user.group, function(err,items){
          if (err) throw err;var def="empty";
          var disDrive = '/drive/';rout= "";ref = [];enc = []; disComm = [];
          if (items.length > 0) {def=items[0];}
          res.render('openfile', {layout:'layout-user', level:user.level, mailfiles:user.mailfiles, docPers:groups, path:disDrive +'No Pending Files.pdf', files:items, disp:"Empty File", branch:user.group, docBr:docBr, docClass:docClass, docTag:docTag, rout:rout, ref:ref, enc:enc, disComm:disComm });
        });
      });
    });
  }

};
