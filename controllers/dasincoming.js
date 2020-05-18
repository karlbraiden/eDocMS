module.exports = function(app, arrDB){
  var scanocr = require('./scanocr');
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
  var promise = require('promise');

  app.use(cookieParser());
  var urlencodedParser = bodyParser.urlencoded({extended:true});
  //var drivetmp = "public/drive/", drive = "D:/drive/";
  var drivetmp = "public/drive/", drive = "D:/Drive/", publicstr='public';
  dbhandle.settingDis((setting)=>{drive = setting.maindrive;});
  dbhandle.settingDis((setting)=>{drivetmp = setting.publicdrive;});
  dbhandle.settingDis((setting)=>{publicstr = setting.publicstr;});
  //list all document classification and tags
  var docClass = []; var docTag = []; var docBr = [];    var grpUsrs = [];
  dbhandle.generateList(arrDB.class, function (res){ docClass = res; });
  dbhandle.generateList(arrDB.tag, function (res){ docTag = res; });
  dbhandle.generateList(arrDB.branch, function (res){ docBr = res; });


  //post handle send file to user for notification
  app.post('/sendincoming', urlencodedParser, function(req,res){
    utilsdocms.validToken(req, res, function (decoded, id){
      sendIncoming(req, res, id);
    });
  });
  //post handle send file to user for notification
  app.post('/sendincomingrelease', urlencodedParser, function(req,res){
    utilsdocms.validToken(req, res, function (decoded, id){
      sendIncomingRelease(req, res, id);
    });
  });
  //get incoming no params
  app.get('/incoming', function(req,res){
    utilsdocms.validToken(req, res, function (decoded, id){
      getIncoming(req, res, id, false);
    });
  });
  //get incoming with params
  app.get('/incoming/:file',function(req,res){
    utilsdocms.validToken(req, res, function(decoded, id){
      getIncoming(req, res, id, true);
    });
  });
  //get incoming with params
  app.get('/incoming/:file/:relfile',function(req,res){
    utilsdocms.validToken(req, res, function(decoded, id){
      getIncoming(req, res, id, true);
    });
  });
  //post incoming with params
  app.post('/incoming', urlencodedParser, function(req,res){
    utilsdocms.validToken(req, res, function(decoded, id){
      postIncoming(req, res, id);
    });
  });
  //post to OCR scan Document to identify classification
  app.post('/incoming/scanDoc', urlencodedParser, function(req,res){
    utilsdocms.validToken(req, res, function(decoded, id){
      dbhandle.userFind(req.body.id, function(user){
        scanocr.outtext(publicstr+ req.body.path, function(data){
          fs.writeFile(drive + 'textML/'+req.body.fileroute+'.txt', data, function (err){
            res.json(user.path);
          });
        });
      });
    });
  });
  //post to AI analyze Document
  app.post('/incoming/analyzeClass', urlencodedParser, function(req,res){
    utilsdocms.validToken(req, res, function(decoded, id){
      console.log('Running AI');
      utilsdocms.runPy('./AI/ClassDoc/docPred.py', drive + 'textML/'+req.body.fileroute+'.txt').then(function(data){
        console.log(data.toString());
        res.json(data.toString());
      });
    });
  });
  //post to AI analyze Document according to branches
  app.post('/incoming/analyzeBranch', urlencodedParser, function(req,res){
    utilsdocms.validToken(req, res, function(decoded, id){
      console.log('Running AI');
      utilsdocms.runPy('./AI/ClassBranch/docPred.py', drive + 'textML/'+req.body.fileroute+'.txt').then(function(data){
        console.log(data.toString());
        res.json(data.toString());
      });
    });
  });
  //html get login
  app.get('/', function(req, res){
    utilsdocms.validToken(req, res, function (decoded, id){
      dbhandle.userFind(id, function(user){
        if (user.level.toUpperCase()=='SYSADMIN') return res.redirect('/kalikot');
        else return res.redirect('/dashlogs');
      });
    });
  });
  //Logout
  app.get('/logout', function(req, res){
    res.clearCookie("token");
    req.logout();
    return res.render('login', {layout:'empty', error:'Valid'});
  });
  //html get comment and annotate
  app.get('/edit',function(req,res){
    utilsdocms.validToken(req, res, function(decoded){
      res.render('editmce');
    });
  });
  //////////////////////////////////////FUNCTIONS START HERE///////////////////////////////////////////////
  //process branch incoming files notification
  function sendIncomingRelease(req, res, id){
    dbhandle.userFind(id, function(user){
      if (user.level.toUpperCase()==='DUTYADMIN'){
        fs.readdir(drivetmp +'Release', function(err,items){
          if (err) throw err;
          res.json(JSON.stringify(items));
        });
      }
    });
  }
  //process branch incoming files notification
  function sendIncoming(req, res, id){
    dbhandle.userFind(id, function(user){
      if (user.level.toUpperCase()==='DUTYADMIN'){
        fs.readdir(drivetmp +'incoming-temp', function(err,items){
          if (err) throw err;
          res.json(JSON.stringify(items));
        });
      }else {
        fs.readdir(drivetmp + user.group, function(err,items){
          if (err) throw err;
          res.json(JSON.stringify(items));
        });
      }
    });
  }
  //process post incoming Function
  function postIncoming(req,res,id){
    dbhandle.userFind(req.body.user, function(user){
      var year = dateformat(Date.now(),'yyyy');var month = dateformat(Date.now(),'mmm').toUpperCase();
      utilsdocms.makeDir(drive + 'Routing Slip/',year, month);
      if ((user.level.toUpperCase()==='DUTYADMIN') && (req.body.save=='incomingroute')){
        dbhandle.validatePassword(req.body.user,req.body.hashval, function (valid){
          if (valid) {
            if (fs.existsSync(path.resolve(drivetmp+"incoming-temp/" + req.body.fileroute))){
              console.log('post incoming route duty');
              routeduty.routeThis(req,res,drivetmp + 'incoming-temp', drivetmp, drive +'incoming/', docBr, user.level,(succ)=>{
                if (succ) monitoring.addBrMonitor(req,res, user, path.resolve(drivetmp));
              });
            } else return res.json('fail');
          } else return res.json('fail');
        });
      } else if ((user.level.toUpperCase()==='DEP') || (user.level.toUpperCase()==='CO')){
        if (req.body.save=='return'){ //but save to folders
          if (fs.existsSync(path.resolve(drivetmp + user.group + "/" + req.body.fileroute))){
            console.log('post incoming return to branch');
            monitoring.getOriginator(req.body.fileroute, function(branch){
              if (branch.toUpperCase()==user.group.toUpperCase()) branch = "N6F";
              routeduty.routNoRefEnc(req,res,drivetmp + user.group + "/", drivetmp + branch + '/');
              monitoring.addRouteOnly(req.body.fileroute, branch, path.resolve(drivetmp));
            });
          } else return res.redirect('/incoming');
        }
      } else { //if not duty admin
        if (req.body.save=='save'){ //but save to folders
          if (fs.existsSync(path.resolve(drivetmp+user.group + "/" + req.body.fileroute))){
            console.log('post incoming save branch');
            routeduty.saveThis(req,res, drivetmp + user.group, drive + user.group + "/");
            monitoring.updateMonitor(req, res);
            utilsdocms.addTag(arrDB.tag, req.body.tag); //add additional hash tags for the documents
          } else return res.redirect('/incoming');
        } else if (req.body.save=='incomingroute'){ //branch routes doc to other branch
          console.log('post incoming route branch');
          dbhandle.validatePassword(req.body.user,req.body.hashval, function (valid){
            if (valid) {
              monitoring.getOriginator(req.body.fileroute, function(branch){
                if ((branch.toUpperCase() != user.group.toUpperCase()) && (branch!='')) {
                  routeduty.routNoRefEnc(req,res,drivetmp + user.group + "/", drivetmp + req.body.branch[0] + '/');
                  monitoring.addRouteOnly(req.body.fileroute, req.body.branch[0], path.resolve(drivetmp));
                } else {
                  routeduty.routeThis(req, res, drivetmp + user.group + "/", drivetmp, drive +'incoming/', docBr, user.level, (succ)=>{
                    if (succ){
                      monitoring.addBrMonitor(req, res, user, path.resolve(drivetmp));
                      dbhandle.docDel(drivetmp + user.group + "/" +req.body.fileroute,()=>{});
                    }
                  });
                }
              });
            } else res.json('fail');
          });
        }
      }
      //if save metadata by all level of users
      if (req.body.save=='update'){
        console.log('post incoming update file');
        routeduty.updateThis(req, res, drive + user.group + "/", (succ)=>{
            if (succ) {
              monitoring.updateMonitor(req, res);
              utilsdocms.addTag(arrDB.tag, req.body.tag); //add additional hash tags for the documents
            }
        });

      } else if (req.body.save=='openroute'){
        console.log('post incoming route file');
        dbhandle.validatePassword(req.body.user,req.body.hashval, function (valid){
          if (valid) {
            routeduty.routeThis(req, res, req.body.path + "/", drivetmp, drive +'incoming/', docBr, user.level, (succ)=>{
              if (succ) monitoring.UpdFileMonitor(req, res, path.resolve(drivetmp),  user.group);
            });

          }else res.json('fail');
        });

      } else if (req.body.save=='archive'){
        if (fs.existsSync(path.resolve(drivetmp+'Release/' + req.body.fileroute))){
          console.log('post incoming save to archive');
          utilsdocms.makeDir(drive + 'Archive/',year, month);
          routeduty.savenochange(req,res, drivetmp+"Release", drive + "Archive/" + year +'/'+month+'/');
        } else return res.redirect('/incoming');
      }
    });
  }
  //Process get incoming function
  function getIncoming(req, res, id, boolFile){
    //refresh lists
    dbhandle.generateList(arrDB.class, function (res){ docClass = res; });
    dbhandle.generateList(arrDB.tag, function (res){ docTag = res; });
    dbhandle.userFind(id, function(user){
      dbhandle.groupFind(user.group, function (groups){
        if (user.level.toUpperCase()==='DUTYADMIN'){
          var disDrive = '/drive/';
          disReadDir = new promise((resolve, reject)=>{
            fs.readdir(drivetmp +'incoming-temp',(err,files)=>{
              if (err) reject(err); var def="empty"; let items = files;
              if (items.length > 0) {def=items[0];} let disFile = def;
              if ((boolFile) && (req.params.file!='release')) disFile = req.params.file;
              else if ((boolFile) && (req.params.file=='release')) disFile = req.params.relfile;
              resolve({disFile:disFile,items:items});
            });
          }).then((items)=>{
            var relitems = [];
            let disRelease = new promise((resolve, reject)=>{
              fs.readdir(drivetmp +'Release', function(err,files){
                if (err) reject(err);
                resolve({disFile:items.disFile,items:items.items,release:files});
              });
            }).then((params)=>{
              let disFile = params.disFile, items = params.items, relitems = params.release;
              utilsdocms.resolveRoutingSlip(null, disFile);
              if (req.params.file!='release'){ //if not in release folder
                if ((dochandle.getExtension(disFile)!='.pdf') && (disFile!='empty')){
                  dochandle.convDoctoPDF(drivetmp + 'incoming-temp/'+ disFile, drivetmp + 'PDF-temp/'+ disFile +'.pdf',function(){
                    return res.render('incomingadmin', { layout:'layout-receive', release:relitems, branch:'incoming-temp', mailfiles:user.mailfiles, docPers:groups, path:disDrive + 'PDF-temp/'+ disFile + '.pdf', files:items, disp:disFile, docBr:docBr});
                  });
                }else return res.render('incomingadmin', { layout:'layout-receive', release:relitems, branch:'incoming-temp', mailfiles:user.mailfiles, docPers:groups, path:disDrive + 'incoming-temp/'+ disFile, files:items, disp:disFile, docBr:docBr});
              } else { //if in release folder
                if ((dochandle.getExtension(disFile)!='.pdf') && (disFile!='empty')){
                  dochandle.convDoctoPDF(drivetmp + 'release/'+ disFile, drivetmp + 'PDF-temp/'+ disFile +'.pdf',function(){
                    return res.render('incomingadmin', { layout:'layout-receive', release:relitems, branch:'release', mailfiles:user.mailfiles, docPers:groups, path:disDrive + 'PDF-temp/'+ disFile + '.pdf', files:items, disp:disFile, docBr:docBr});
                  });
                }else return res.render('incomingadmin', { layout:'layout-receive', release:relitems, branch:'release', mailfiles:user.mailfiles, docPers:groups, path:disDrive + 'release/'+ disFile, files:items, disp:disFile, docBr:docBr});

              }
            }).catch((err)=>{ console.log(err);});
          }).catch((err)=>{console.log(err);});
        } else if ((user.level.toUpperCase()==='DEP') || (user.level.toUpperCase()==='CO')){
          fs.readdir(drivetmp + user.group, function(err,items){
            if (err) throw err;var def="empty";
            if (items.length > 0) {def=items[0];} var disDrive = '/drive/';var disFile = def;
            if (boolFile) disFile = req.params.file;
            dbhandle.docFind(drivetmp + user.group +'/'+disFile, function (found){
              let disCat = 'none';
              if (found) disCat = found.category;
              utilsdocms.resolveRoutingSlip(found, disFile);
              if ((dochandle.getExtension(disFile)!='.pdf') && (disFile!='empty')){
                dochandle.convDoctoPDF(drivetmp + user.group +'/'+disFile,drivetmp + 'PDF-temp/'+disFile +'.pdf', function(){
                  return res.render('incomingroyal', {layout:'layout-royal',  level:user.level, category:disCat, mailfiles:user.mailfiles, docPers:groups, path:disDrive + 'PDF-temp/'+ disFile +'.pdf', files:items, disp:disFile, branch:user.group});
                });
              }else return res.render('incomingroyal', {layout:'layout-royal',  level:user.level, category:disCat, mailfiles:user.mailfiles, docPers:groups, path:disDrive + user.group +'/'+ disFile, files:items, disp:disFile, branch:user.group});

            });
          });
        } else {
          fs.readdir(drivetmp + user.group, function(err,items){
            if (err) throw err;var def="empty";
            if (items.length > 0) {def=items[0];} var disDrive = '/drive/';var disFile = def;
            if (boolFile) disFile = req.params.file;
            dbhandle.docFind(drivetmp + user.group +'/'+disFile, function (found){
              utilsdocms.resolveRoutingSlip(found, disFile);
              monitoring.getOriginator(disFile, function(branch){
                let runScanAI = 'true';
                if ((branch=='')||(branch.toUpperCase()==user.group.toUpperCase())) runScanAI = 'true';
                else  runScanAI = 'false';
                if ((dochandle.getExtension(disFile)!='.pdf') && (disFile!='empty')){
                  dochandle.convDoctoPDF(drivetmp + user.group +'/'+disFile,drivetmp + 'PDF-temp/'+disFile +'.pdf', function(){
                    return res.render('incomingbranch', {layout:'layout-user', level:user.level, runscanai:runScanAI, mailfiles:user.mailfiles, docPers:groups, path:disDrive + 'PDF-temp/'+ disFile +'.pdf', files:items, disp:disFile, branch:user.group, docBr:docBr, docClass:docClass, docTag:docTag});
                  });
                }else return res.render('incomingbranch', {layout:'layout-user', level:user.level,  runscanai:runScanAI, mailfiles:user.mailfiles, docPers:groups, path:disDrive + user.group +'/'+ disFile, files:items, disp:disFile, branch:user.group, docBr:docBr, docClass:docClass, docTag:docTag});
              });
            });
          });
        }
      });
    });
  };


};
