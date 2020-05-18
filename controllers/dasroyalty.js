module.exports = function(app, arrDB){
  var fs = require('fs');
  var path = require('path');
  var bodyParser = require('body-parser');
  const cookieParser = require('cookie-parser');
  var routeduty = require('./routeduty');
  const dbhandle = require('./dbhandle');
  const dochandle = require('./dochandle');
  const monitoring = require('./monitoring');
  const pdflib = require('./pdflib');
  const utilsdocms = require('./utilsdocms');
  const dateformat = require('dateformat');

  app.use(cookieParser());
  var urlencodedParser = bodyParser.urlencoded({extended:true});
  var drivetmp = "public/drive/", drive = "D:/Drive/", publicstr = 'public';
  dbhandle.settingDis((setting)=>{drive = setting.maindrive;});
  dbhandle.settingDis((setting)=>{drivetmp = setting.publicdrive;});
  dbhandle.settingDis((setting)=>{publicstr = setting.publicstr;});
  //get handle signing PDF
  app.get('/signpdf', function(req,res){
    utilsdocms.validToken(req, res, function (decoded, id){
      getsignpdf(req, res, id);
    });
  });
  //post handle signing PDF
  app.post('/signpdf', urlencodedParser, function(req,res){
    utilsdocms.validToken(req, res, function (decoded, id){
      postsignpdf(req, res, id);
    });
  });
  //post handle release PDF
  app.post('/releasedoc', urlencodedParser, function(req,res){
    utilsdocms.validToken(req, res, function (decoded, id){
      releasesignpdf(req, res, id);
    });
  });

  //////////////////////////////////////FUNCTIONS START HERE///////////////////////////////////////////////
  //process document release after signing
  function releasesignpdf(req, res, id){
    dbhandle.userFind(id, function(user){
      dbhandle.validatePassword(req.body.user,req.body.hashval, function (result){
        if (result) {
          console.log('Release Document');
          var year = dateformat(Date.now(),'yyyy');var month = dateformat(Date.now(),'mmm').toUpperCase();
          pdflib.mergePDF(publicstr+req.body.filepath, drivetmp+'PDF-temp/'+req.body.fileroute+'.'+req.body.user+'.pdf', drivetmp+'PDF-temp/'+req.body.user+'.res.pdf', parseInt(req.body.num,10), () =>{
            //ensure folders exists
            if (!fs.existsSync(drive+user.group)) fs.mkdirSync(drive+user.group);
            if (!fs.existsSync(drive+user.group+'/Released')) fs.mkdirSync(drive+user.group+'/Released');
            utilsdocms.makeDir(drive+user.group+'/Released/', year, month);
            //copy signed PDF from temp to next branch
            let dstFile = req.body.fileroute;
            if (fs.existsSync(drivetmp+'PDF-temp/'+req.body.user+'.res.pdf')) {
              if (fs.existsSync(drivetmp+'PDF-temp/'+req.body.fileroute+'.'+req.body.user+'.pdf')){
                fs.copyFileSync(drivetmp+'PDF-temp/'+req.body.fileroute+'.'+req.body.user+'.pdf', drive+user.group+'/Released/'+year+'/'+month+'/'+req.body.fileroute+'.pdf'); //make a copy to drive folder
                if (fs.existsSync(drivetmp+'PDF-temp/'+req.body.user+'.res.pdf')) fs.unlinkSync(drivetmp+'PDF-temp/'+req.body.user+'.res.pdf');
              }
              if (dochandle.getExtension(req.body.fileroute)!='.pdf') dstFile = req.body.fileroute+'.pdf';
              routeduty.routRoyal(req,res,drivetmp+'PDF-temp/'+req.body.fileroute+'.'+req.body.user+'.pdf', drivetmp + req.body.branch + '/'+ dstFile, dstFile, drivetmp+user.group+'/'+req.body.fileroute);
            } else routeduty.routRoyal(req,res,drivetmp+user.group+'/'+req.body.fileroute, drivetmp + req.body.branch + '/' + req.body.fileroute, req.body.fileroute, drivetmp+user.group+'/'+req.body.fileroute);
            if (user.level.toUpperCase()=="CO"){
              dbhandle.monitorFindFile(req.body.fileroute, function(result){ //delete in monitoring
                if (result) dbhandle.monitorDel(req.body.fileroute, function(){});
              });
            }else if (user.level.toUpperCase()=="DEP") {
              dbhandle.monitorFindFile(req.body.fileroute, function(result){ //delete in monitoring
                if (result) {
                  deyt = dateformat(Date.now(),"dd mmm yyyy HH:MM");
                  result.route.push({deyt:deyt,branch:req.body.branch});
                  dbhandle.monitorAddRoute(dstFile, req.body.fileroute, result.route, path.resolve(drivetmp));
                }
              });
            }
          });
        } else res.json('fail');
      });
    });
  }
  //process document signing post request
  function postsignpdf(req, res, id){
    dbhandle.userFind(id, function(user){
      console.log('Sign Document');
      pdflib.addSignMainDoc(user.group, id, publicstr+req.body.filepath, drivetmp+'PDF-temp/'+req.body.user+'.res.pdf', req.body.disX, req.body.disY, req.body.nodate, req.body.width, req.body.height, () =>{
        res.json('successful');
      });
    });
  }
  //Process get incoming function
  function getsignpdf(req, res, id, boolFile){
    console.log('return pages to the signing PDF');
    pdflib.returnPage(publicstr+req.query.filepath, drivetmp+'PDF-temp/'+req.query.user+'.pdf',req.query.num,() =>{
      res.json('successful');
    });
  };

};
