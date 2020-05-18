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


  //post handle search monitoring for reference and enclosure prior routing
  app.post('/searchrefmonitor', urlencodedParser, function(req,res){
    utilsdocms.validToken(req, res, function (decoded, id){
      searchrefmonitor(req, res, id);
    });
  });
  //post handle toggle continue routing or new routing slip
  app.post('/togglepdfrout', urlencodedParser, function(req,res){
    utilsdocms.validToken(req, res, function (decoded, id){
      togglepdfrout(req, res, id);
    });
  });
  //post handle scanning of QRCode
  app.post('/scancode', urlencodedParser, function(req,res){
    utilsdocms.validToken(req, res, function (decoded, id){
      scanCode(req, res, id);
    });
  });
  //post handle send file to user for notification
  app.post('/senduser', urlencodedParser, function(req,res){
    utilsdocms.validToken(req, res, function (decoded, id){
      sendUser(req, res, id);
    });
  });
  //post handle merge pdf after branch signing
  app.post('/mergesigndoc', urlencodedParser, function(req,res){
    utilsdocms.validToken(req, res, function (decoded, id){
      mergesigndoc(req, res, id);
    });
  });
  //post handle document database query and send to client
  app.post('/docquery', urlencodedParser, function(req,res){
    utilsdocms.validToken(req, res, function (decoded, id){
      docQuery(req, res, id);
    });
  });
  //////////////////////////////////////FUNCTIONS START HERE///////////////////////////////////////////////
  //process document release after signing
  function mergesigndoc(req, res, id){
    dbhandle.userFind(id, function(user){
      dbhandle.validatePassword(req.body.user,req.body.hashval, function (result){
        console.log('Merge document after branch signature');
        if (result) {
          var year = dateformat(Date.now(),'yyyy');var month = dateformat(Date.now(),'mmm').toUpperCase();
          let disNewFile = req.body.fileroute+'.'+req.body.user+'.pdf';
          //console.log('public'+req.body.filepath);
          pdflib.mergePDF('public'+req.body.filepath, drivetmp+'PDF-temp/'+disNewFile, drivetmp+'PDF-temp/'+req.body.user+'.res.pdf', parseInt(req.body.num,10), () =>{
            //copy signed PDF from temp to next branch
            fs.copyFileSync(drivetmp+'PDF-temp/' + disNewFile, req.body.realpath + disNewFile); //make a copy to drive folder
            dbhandle.docFind(req.body.realpath+req.body.fileroute, function (found) {
              let newID = utilsdocms.generateID();
              dbhandle.docFind(req.body.realpath + disNewFile, function (disfound) {
                if (!disfound) {
                  utilsdocms.makeDir(drive + 'Routing Slip/', year, month);
                  let dstRoutSlip = drive + 'Routing Slip/'+year+'/'+month+'/route-'+disNewFile+'.pdf';
                  let webdstRoutSlip = drivetmp + 'PDF-temp/route-'+disNewFile+'.pdf';
                  if (found){
                    if (fs.existsSync(found.routeslip)) {
                      fs.copyFileSync(found.routeslip, dstRoutSlip);fs.copyFileSync(found.routeslip, webdstRoutSlip);
                    } else {fs.copyFileSync(drivetmp+'routeblank.pdf', webdstRoutSlip);fs.copyFileSync(drivetmp+'routeblank.pdf', dstRoutSlip); }
                    dbhandle.docCreate(newID, disNewFile, req.body.realpath + disNewFile, found.category, found.author, found.projects, found.deyt, found.size, found.content, dstRoutSlip, found.reference, found.enclosure, found.comment);
                  } else {
                    fs.copyFileSync(drivetmp+'routeblank.pdf', webdstRoutSlip); fs.copyFileSync(drivetmp+'routeblank.pdf', dstRoutSlip);
                    dbhandle.docCreate(newID, disNewFile, req.body.realpath + disNewFile, "", "", [], Date.now(), 0, "", dstRoutSlip, [], [], []);
                  }
                }
                res.json(disNewFile);
              });
            });

          });
        } else res.json('fail');
      });
    });
  }
  //process toggle continue routing or new routing slip
  function togglepdfrout(req, res, id){
    console.log('toggle previous routing slip ');
    if (req.body.toggle=='true'){
      if (fs.existsSync(drivetmp + 'PDF-temp/routemonitor-'+ req.body.filename +'.pdf')){
        fs.copyFileSync(drivetmp + 'PDF-temp/routemonitor-'+ req.body.filename +'.pdf', drivetmp + 'PDF-temp/route-'+ req.body.filename +'.pdf');
      }
    } else {
      toggleback(req.body.filename);
    }
    res.json('toggle');
  }
  function toggleback(filename){
    if (fs.existsSync(drivetmp + 'PDF-temp/routeorig-'+ filename +'.pdf')){
      fs.copyFileSync(drivetmp + 'PDF-temp/routeorig-'+ filename +'.pdf', drivetmp + 'PDF-temp/route-'+ filename +'.pdf');
    }
  }
  //process document scan QR COde
  function searchrefmonitor(req, res, id){
    console.log('Search reference and enclosure in monitoring');
    dbhandle.monitorFindFile(req.body.filename, function (filename){
      if (!filename){
        monitoring.searchRefEnc(req, (resultpath, resultfile)=>{
          //console.log(resultpath+resultfile);
          if (resultfile){
            //console.log(resultpath+'/'+resultfile);
            dbhandle.docFind(resultpath+'/'+resultfile, function (found){
              if (found){
                if (fs.existsSync(found.routeslip)) {
                  if (!fs.existsSync(drivetmp + 'PDF-temp/routeorig-'+ req.body.filename +'.pdf')) fs.copyFileSync(drivetmp + 'PDF-temp/route-'+ req.body.filename +'.pdf', drivetmp + 'PDF-temp/routeorig-'+ req.body.filename +'.pdf');
                  fs.copyFileSync(found.routeslip, drivetmp + 'PDF-temp/routemonitor-'+ req.body.filename +'.pdf');
                  fs.copyFileSync(found.routeslip, drivetmp + 'PDF-temp/route-'+ req.body.filename +'.pdf');
                  res.json(JSON.stringify({result:'found',file:resultfile}));
                } else {toggleback(req.body.filename);res.json(JSON.stringify({result:'notfound',file:null}));}
              } else {toggleback(req.body.filename);res.json(JSON.stringify({result:'notfound',file:null}));}
            });
          } else {toggleback(req.body.filename);res.json(JSON.stringify({result:'notfound',file:null}));}
        });
      } else {toggleback(req.body.filename);res.json (JSON.stringify({result:'routed',file:null}));}
    });
  }
  //process document scan QR COde
  function scanCode(req, res, id){
    dbhandle.userFind(id, function(user){
      console.log('scan QR Code');
      dbhandle.validatePassword(req.body.user,req.body.hashval, function (result){
        if (result) {
          var year = dateformat(Date.now(),'yyyy');var month = dateformat(Date.now(),'mmm').toUpperCase();
          var filesrch = req.body.filename;
          if (req.body.filename != req.body.monitfile) {
            fs.copyFileSync(drivetmp+'PDF-temp/route-'+req.body.filename+".pdf", drive+"Routing Slip/"+year+"/"+month+"/"+"route-"+req.body.filename+".pdf");
            filesrch = req.body.monitfile;
          }
          dbhandle.monitorFindFile(filesrch, function (file){
            //count routed branch to estimate line location
            var cnt = 1;
            if (file) cnt = file.route.length + 1;
            else {
              fs.copyFileSync(drivetmp + 'routeblank.pdf', drivetmp+'PDF-temp/route-'+req.body.filename+".pdf");
              fs.copyFileSync(drivetmp + 'routeblank.pdf', drive+"Routing Slip/"+year+"/"+month+"/"+"route-"+req.body.filename+".pdf");
            }
            pdflib.addSignRoutePDF(user.level, cnt, drive+"Routing Slip/"+year+"/"+month+"/"+"route-"+req.body.filename+".pdf", path.resolve(drivetmp+'PDF-temp/route-')+req.body.filename+".pdf", req, user.group, () =>{
              res.json('successful');
            });
          });
        }else {
          res.json('notok');
        }
      });
    });
  }
  //process send file to user function
  function sendUser(req, res, id){
    console.log('Send File to user for notification');
    dbhandle.userFind(req.body.user, function (user){
      //console.log(found);
      if (user){
        dbhandle.userFind(req.body.send, function(disuser){
          if (disuser) {
              routeduty.updateThis(req, res, drive + user.group + "/", (succ)=>{
                if (succ){
                  let found = disuser.mailfiles.find((element)=> {return element.toUpperCase()==(req.body.path+req.body.newfile).toUpperCase();});
                  if (!found) disuser.mailfiles.push(req.body.path+req.body.newfile);
                  dbhandle.userUpdate(disuser.userN, disuser.hashP, disuser.email, disuser.salt, disuser.group, disuser.level, disuser.path, disuser.mailfiles, ()=>{
                    monitoring.updateMonitor(req, res);
                    utilsdocms.addTag(arrDB.tag,req.body.tag); //add additional hash tags for the documents
                  });
                }
              });
          } else res.json('notfound');
        });
      }
    });
  }
  //process documnet DB query function
  function docQuery(req, res, id){
    console.log('Query Doc DB');
    var disPath= req.body.path;
    dbhandle.docFind(disPath, function (found){
      rout= "";ref = [];enc = []; disClas = ""; disTag = [];disComm = [];
      if (found){
        disComm= found.comment; rout= found.routeslip;ref = found.reference;enc = found.enclosure; disClas = found.category; disTag = found.projects;
      }
      var arrBr = [{rout:rout, ref:ref, enc:enc, disClas:disClas, disTag:disTag, disComm:disComm}];
      res.json(JSON.stringify(arrBr));
    });
  }
  //html get comment and annotate
  app.get('/edit',function(req,res){
    utilsdocms.validToken(req, res, function(decoded){
      res.render('editmce');
    });
  });

};
