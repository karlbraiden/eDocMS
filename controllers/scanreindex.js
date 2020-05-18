const fs = require('fs');
const dochandle = require('./dochandle');
const dbhandle = require('./dbhandle');
var abspath = require('path');
const textract = require('textract');
const wordextractor = require("word-extractor");
var toPdf = require("office-to-pdf");
const scanocr = require('./scanocr');

var extractor = new wordextractor();
var classModel = dbhandle.disModel('class');
var tagModel = dbhandle.disModel('tag');
var brModel = dbhandle.disModel('branch')
var docClass = []; var docTag = []; var docBr = [];
dbhandle.generateList(classModel, function (res){ docClass = res; });
dbhandle.generateList(tagModel, function (res){ docTag = res; });
dbhandle.generateList(brModel, function (res){ docBr = res; });
var months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
var arrFileExt=['.pdf','.doc','.docx','.xls','.xlsx','.pptx','.txt'];

function scanreindex(dir, folder, callback){
  let idxDType = ['.idxD']; let idxIType = ['.idxI'];let bolOutres = false;
  function walkDir(currentPath, disFolder, callboy) {
    currentPath = currentPath.replace(/\\/g,'/');
    let folders = currentPath.split('/');let parentFolder = '';
    if ((months.includes(disFolder)) && (folders.length > 3)) parentFolder = folders[folders.length - 4];
    else if (folders.length > 2) parentFolder = folders[folders.length - 3];
    let files = fs.readdirSync(currentPath);

    for (let i in files) {
      let curFile = currentPath + files[i];
      disFile = files[i];
      if (fs.statSync(curFile).isFile()) {
        if ((disFile!=disFolder +'.idxD') && (disFile!=disFolder +'.idxI')){ //if not index file
          if ((arrFileExt.includes(getExtension(disFile))) && (disFile.substring(0,1)!='~') && (disFile.substring(0,6).toLowerCase()!='route-')){
            let mainId = generateID();
              addeditDocu(mainId, curFile, disFolder, disFile, function(id, disCont){
                let disFs = fs.statSync(curFile);
                if (disCont.length > 2000) disCont = disCont.substring(0,2000);
                editMetaDB(id, curFile, disFile, disFs.size, disFs.mtime, disCont, disFolder, parentFolder);
            });
          }
        }
      } else if (fs.statSync(curFile).isDirectory()) {
          walkDir(curFile +'/', files[i], ()=>{});
          console.log(curFile);
      }
    }
    callboy();
  };
  walkDir(dir, folder, ()=>{
    console.log('finish');
  });
}

scanreindex('D:/drive/', 'drive');


//Edit metadata from database
function editMetaDB(disId, path, disFile, fsSize, fsDeyt, disCont, disFolder, parentFolder){
  dbhandle.generateList(tagModel, function (res){ docTag = res; });
  path = path.replace(/\\/g,'/');
  dbhandle.docFindbyId(disId, function (result) {
      if (!result) {
        if (!months.includes(disFolder)){
          if (!docClass.includes(disFolder)){
            if (parentFolder.toUpperCase()=='TAGS'){
              dbhandle.docCreate(disId, disFile, path, '', "System", [disFolder], fsDeyt, fsSize, disCont,'',[],[],[]);
              UpdateTag(docTag, disFolder);
            } else dbhandle.docCreate(disId, disFile, path, '', "System", [], fsDeyt, fsSize, disCont,'',[],[],[]);
          } else dbhandle.docCreate(disId, disFile, path, disFolder, "System", [], fsDeyt, fsSize, disCont,'',[],[],[]);
        } else {

             if (docClass.includes(parentFolder)) dbhandle.docCreate(disId, disFile, path, parentFolder, "System", [], fsDeyt, fsSize, disCont,'',[],[],[]);
            else dbhandle.docCreate(disId, disFile, path, '', "System", [], fsDeyt, fsSize, disCont,'',[],[],[]);
        }
      } else dbhandle.docEditWatch(disId, disFile, path, fsDeyt, fsSize, disCont);
  });

};
//Add Document
async function addeditDocu(disId, path, disFolder, disFile, callback){
    //sanitize file content
    var disContent = "";
    switch(getExtension(disFile))
    {
      case '.doc':
            var extracted = extractor.extract(path);
            extracted.then(async function(doc) {
              if (doc===null) {disContent ='No Content. File Corrupted';}
              else {disContent = await doc.getBody().replace(/[\r\n\t]+/gm,' ');}
              disDocHandle(disContent, disId, path, disFolder, disFile, function (id, newCont){
                callback(id, newCont);
              });

            }).catch(async function(err){
              disContent= 'No Content. File Corrupted';
              disDocHandle(disContent, disId, path, disFolder, disFile, function (id, newCont){
                callback(id, newCont);
              });

            });
            break;
      /*case '.ppt':
          var wordBuffer = fs.readFileSync(path);
          toPdf(wordBuffer).then(
            (pdfBuffer) => {
              fs.writeFileSync(path + '.pdf', pdfBuffer);
            }, (err) => {
              console.log(err);
            });
        break;*/
      default:
        await textract.fromFileWithPath(path, async function(err,text){
          //if scanned pdf ....OCR this
          disContent = await text;
          if (disContent === null) disContent = "No Content. Corrupted.";
          if ((disContent.length < 1000) && (getExtension(disFile)==='.pdf')){
            scanocr.outtext(path, async function(data){
              disContent = data.replace(/[\r\n\t]+/gm,' ');
              disDocHandle(disContent, disId, path, disFolder, disFile, function(id, newCont){
                callback(id, newCont);
              });

            });
          } else {
            disDocHandle(disContent, disId, path, disFolder, disFile, function(id, newCont){
              callback(id, newCont);
            });

          }
        });
    }
  };

//Add and Update document into index
function disDocHandle(disContent, disId, path, disFolder, disFile, callback){
  if (disContent.length > 5000) disContent = disContent.substring(0,5000);
    dochandle.addeditDocu(disId, path.substr(0,path.length-disFile.length), disFolder +'.idxD', disFolder +'.idxI', disContent, disFile, disFolder, async function(id){
      callback(id, disContent);
    });
};
//function generate unique numeric // ID
function generateID(){
  var dateVal = Date.now().toString();
  var randomVal = (Math.floor(Math.random() * Math.floor(9))).toString();
  var id = Math.floor(dateVal+randomVal);
  return id;
};
//function to get the file extension
function getExtension(filename) {
    if (filename.length == 0)
        return "";
    var dot = filename.lastIndexOf(".");
    if (dot == -1)
        return "";
    var extension = filename.substr(dot, filename.length);
    return extension;
};

//process additional hashtags
function UpdateTag (docTag, tag){
  if (!docTag.includes(tag)){
    dbhandle.addList(tagModel,tag);
  }
}
